import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { Order } from "../types";

import * as AWS from "aws-sdk";
import { Key } from "aws-sdk/clients/dynamodb";
import { AttributeValue } from "aws-sdk/clients/dynamodb";

// Headers for everything
const headers = {
  "Access-Control-Allow-Origin": "*",
};

// Declaring aws clients
const docClient = new AWS.DynamoDB.DocumentClient();

/**
 * Put an order on DynamoDB's orders table.
 * @param order The whole order object.
 * @returns A promise with the uploaded order.
 */
const createOrder = async (order: Order) => {
  // Put item on aws table
  const params = {
    TableName: "BeanOrders",
    Item: { ...order },
  };

  // Put order on table
  await docClient.put(params).promise();

  // Return uploaded order
  return order;
};

/**
 * Get a order based on its id.
 * @param id The order's id.
 * @returns A promise with the response's message and the DynamoDB Item.
 */
const getOrder = async (id: string) => {
  // Build table params
  const params = {
    TableName: "BeanOrders",
    Key: { id },
  };

  // Get order
  const data = await docClient.get(params).promise();

  // Return value
  return data.Item as Order;
};

/**
 * Get N orders from last evaluated key.
 * @param userId user ID for orders.
 * @returns A promise with the response's message and the DynamoDB Item.
 */
const getOrders = async (
  userId?: string
) => {
  // Build params object
  const params: {
    TableName: string;
    ExclusiveStartKey?: Key;
    FilterExpression?: string;
    ExpressionAttributeValues?: AWS.DynamoDB.DocumentClient.ExpressionAttributeValueMap;
    ExpressionAttributeNames?: AWS.DynamoDB.DocumentClient.ExpressionAttributeNameMap;
  } = {
    TableName: "BeanOrders",
  };

  if (userId) {
    // Add filter expression to match order name
    params.FilterExpression = "contains(#name, :searchTerm)";
    params.ExpressionAttributeValues = {
      ":searchTerm": userId,
    };
    params.ExpressionAttributeNames = {
      "#name": "userId",
    };
  }

  // Get orders until reaching limit
  let ordersGot: Order[] = [];
  while (true) {
    // Get orders
    const { Items: orders, LastEvaluatedKey: lastEvaluatedKey } =
      await docClient.scan(params).promise();
      ordersGot.push(...(orders as Order[]));

    // Return success when no more items
    if (!lastEvaluatedKey)
      return { orders: ordersGot, LastEvaluatedKey: undefined };
  }
};

// Main lambda handler
export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get HTTP method from the event
  const method = event.httpMethod;

  // Get the api path as an array.
  const pathAsArray = event.path.split("/");

  // Get scope, to know if we're performing actions on a single order or the whole table
  const scope: "orders" | "order" =
    pathAsArray[pathAsArray.length - 1] === "orders" ? "orders" : "order";

  try {
    // GET orders method
    if (method === "GET" && scope === "orders") {
      const { pageSize, LastEvaluatedKey, search } =
        event.queryStringParameters as {
          pageSize: string;
          LastEvaluatedKey: string;
          search: string | undefined;
        };
        
      // Get the the orders
      const orders = await getOrders(
        search
      );

      // Return method's response
      return {
        body: JSON.stringify({
          ...orders,
          message: "Success",
        }),
        statusCode: 200,
        headers,
      };

      // GET order method
    } else if (method === "GET" && scope === "order") {
      // Get the the orders
      const order = await getOrder(event.pathParameters!.id!);

      // Return method's response
      return {
        body: JSON.stringify({
          order,
          message: "Success",
        }),
        statusCode: 200,
        headers,
      };

      // Create order method
    } else if (method === "POST" && scope === "orders") {
      // Get data from body
      const order = JSON.parse(event.body!).order as Order;

      // Make sure that the order has the correct format
      if (
        typeof order.id !== "string" ||
        typeof order.userId !== "string" ||
        typeof order.products !== "object"
      )
        return {
          statusCode: 400,
          body: `Please provide body in format '{
            id: string;
            userId: string;
            description: string;
            minPerPurchase: number;
            variants: {
              id: string;
              name: string;
              stock: number;
              priceRanges: {
                minQuantity: number;
                maxQuantity: number;
                price: number;
              }[];
            }[];
          };'`,
          headers,
        };

      // Create order
      const newOrder = await createOrder(order);

      // Return method's response
      return {
        body: JSON.stringify({ newOrder, message: "Success" }),
        statusCode: 200,
        headers,
      };
    }
    return {
      body: '{"message": "Not such endpoint"}',
      statusCode: 502,
      headers,
    };
  } catch (error) {
    console.log(error);
    return {
      body: `{"error": ${(error as Error).toString()}}`,
      statusCode: 502,
      headers,
    };
  }
};