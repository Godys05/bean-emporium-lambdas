// AWS imports
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import * as AWS from "aws-sdk";

// Local types
import { Product } from "../types";
import { Key } from "aws-sdk/clients/dynamodb";

// Declaring aws clients
const docClient = new AWS.DynamoDB.DocumentClient();

// Headers for everything
const headers = {
  "Access-Control-Allow-Origin": "*",
};

// Helper functions
/**
 * Delete a product based on its id.
 * @param id The product's id.
 * @returns An empty promise.
 */
const deleteProduct = async (id: string) => {
  // Build table params
  const params = {
    TableName: "BeanProducts",
    Key: { id },
  };

  // Delete product
  await docClient.delete(params).promise();
};

/**
 * Get a product based on its id.
 * @param id The product's id.
 * @returns A promise with the response's message and the DynamoDB Item.
 */
const getProduct = async (id: string) => {
  // Build table params
  const params = {
    TableName: "BeanProducts",
    Key: { id },
  };

  // Get product
  const data = await docClient.get(params).promise();

  // Return value
  return data.Item as Product;
};

/**
 * Get N products from last evaluated key.
 * @param pageSize The number of items to retrieve.
 * @param LastEvaluatedKey The key of the last item, which is used to get the next N items, starting from here.
 * @returns A promise with the response's message and the DynamoDB Item.
 */
const getProducts = async (
  pageSize: number,
  LastEvaluatedKey?: { id: string }
) => {
  // Build params obj
  const params: { TableName: string; Limit: number; ExclusiveStartKey?: Key } =
    {
      TableName: "BeanProducts",
      Limit: pageSize, // Maximum number of items to retrieve per page
      ExclusiveStartKey: LastEvaluatedKey
        ? (LastEvaluatedKey as Key)
        : undefined,
    };

  // Get products
  const { Items: products, LastEvaluatedKey: lastEvaluatedKey } =
    await docClient.scan(params).promise();

  return { products, LastEvaluatedKey: lastEvaluatedKey };
};

/**
 * Put a product on DynamoDB's products table.
 * @param product The whole product object.
 * @returns A promise with the uploaded product.
 */
const createProduct = async (product: Product) => {
  // Put item on aws table
  const params = {
    TableName: "BeanProducts",
    Item: { ...product },
  };

  // Put product on table
  await docClient.put(params).promise();

  // Return uploaded product
  return product;
};

/**
 * Update a product by id.
 * @param id The products's id.
 * @param productData The product's data.
 * @returns A promise with the updated product.
 */
const updateProduct = async (id: string, productData: Partial<Product>) => {
  // Operation params.
  let params: any = {
    TableName: "BeanProducts",
    Key: { id },
    ReturnValues: "ALL_NEW",
  };

  // Build update operation.
  let expression = "set ";
  let values: { [key: string]: string } = {};
  let names: { [key: string]: string } = {};
  Object.keys(productData).forEach((key, i) => {
    const attributeName = `#attr${i}`;
    expression += `${attributeName} = :val${i}${
      i < Object.keys(productData).length - 1 ? "," : ""
    } `;
    // @ts-ignore
    values[`:val${i}`] = productData[key];
    names[attributeName] = key;
  });
  params["UpdateExpression"] = expression;
  params["ExpressionAttributeValues"] = values;
  params["ExpressionAttributeNames"] = names;

  // Perform update
  await docClient.update(params).promise();

  // Return updated product
  return await getProduct(id);
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

  // Get scope, to know if we're performing actions on a single product or the whole table
  const scope: "products" | "product" =
    pathAsArray[pathAsArray.length - 1] === "products" ? "products" : "product";

  try {
    // GET products method
    if (method === "GET" && scope === "products") {
      const { pageSize, LastEvaluatedKey } = event.queryStringParameters as {
        pageSize: string;
        LastEvaluatedKey: string;
      };
      // Get the the products
      const products = await getProducts(
        parseInt(pageSize),
        LastEvaluatedKey
          ? {
              id: LastEvaluatedKey,
            }
          : undefined
      );

      // Return method's response
      return {
        body: JSON.stringify({
          ...products,
          message: "Success",
        }),
        statusCode: 200,
        headers,
      };

      // GET product method
    } else if (method === "GET" && scope === "product") {
      // Get the the products
      const product = await getProduct(event.pathParameters!.id!);

      // Return method's response
      return {
        body: JSON.stringify({
          product,
          message: "Success",
        }),
        statusCode: 200,
        headers,
      };

      // Create product method
    } else if (method === "POST" && scope === "products") {
      // Get data from body
      const product = JSON.parse(event.body!).product as Product;

      // Make sure that the product has the correct format
      if (
        typeof product.id !== "string" ||
        typeof product.description !== "string" ||
        typeof product.minPerPurchase !== "number" ||
        typeof product.name !== "string" ||
        typeof product.variants !== "object"
      )
        return {
          statusCode: 400,
          body: `Please provide body in format '{
            id: string;
            name: string;
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

      // Create product
      const newProduct = await createProduct(product);

      // Return method's response
      return {
        body: JSON.stringify({ newProduct, message: "Success" }),
        statusCode: 200,
        headers,
      };

      // PATCH method
    } else if (method === "PATCH" && scope === "product") {
      // Get data from body
      const { newProductFields } = JSON.parse(event.body!) as {
        newProductFields: Partial<Product>;
      };

      // Perform update
      const product = await updateProduct(
        event.pathParameters!.id!,
        newProductFields
      );

      // Return 404 if there was not such product
      if (!product)
        return {
          body: JSON.stringify({
            product: undefined,
            message: "Product not found",
          }),
          statusCode: 404,
          headers,
        };

      // Return method's response
      return {
        body: JSON.stringify({ product: product, message: "Success" }),
        statusCode: 200,
        headers,
      };
    } else if (method === "DELETE" && scope === "product") {
      // Perform deletion
      await deleteProduct(event.pathParameters!.id!);

      // Return method's response
      return {
        body: JSON.stringify({ message: "Success" }),
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
