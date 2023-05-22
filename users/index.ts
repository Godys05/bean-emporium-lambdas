// AWS imports
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import * as AWS from "aws-sdk";

// Local types
import { Cart, User } from "../types";

// Declaring aws clients
const docClient = new AWS.DynamoDB.DocumentClient();
const userUpdatableProperties = ["name", "email", "cart"];

// Helper functions
/**
 * Get a user's cart based on their userId.
 * @param id The user's id.
 * @returns A promise with the response's message and the DynamoDB Item.
 */
const getUserCart = async (userId: string) => {
  // Get user
  const user = await getUser(userId);

  // Return empty
  if (!user) return;

  // Return cart
  return user.cart;
};

/**
 * Get a user based on their ID.
 * @param id The user's id.
 * @returns A promise with the DynamoDB Item as a User.
 */
const getUser = async (id: string) => {
  // Build table params
  const params = {
    TableName: "BeanUsers",
    Key: { id },
  };

  // Get user
  const data = await docClient.get(params).promise();

  // Return value
  return data.Item as User | undefined;
};

/**
 * Validate and create a full user object, given their data.
 * @param id The user's id.
 * @param email The user's email.
 * @param name The user's name.
 * @returns A promise with the uploaded user.
 */
const createUser = async (id: string, email: string, name: string) => {
  // Build user object
  const user: User = {
    id,
    email,
    name,
    cart: [],
  };

  // Put item on aws table
  const params = {
    TableName: "BeanUsers",
    Item: { ...user },
  };
  await docClient.put(params).promise();

  // Return uploaded user
  return user;
};

/**
 * Update a user by id. We can update mail, name and cart.
 * @param id The user's id.
 * @param userData The user's data.
 * @returns A promise with the uploaded user.
 */
const updateUser = async (id: string, userData: Partial<User>) => {
  // Operation params.
  let params: any = {
    TableName: "BeanUsers",
    Key: { id },
    ReturnValues: "ALL_NEW",
  };

  // Build update operation.
  let expression = "set ";
  let values: { [key: string]: string } = {};
  let names: { [key: string]: string } = {};
  Object.keys(userData).forEach((key, i) => {
    if (userUpdatableProperties.includes(key)) {
      const attributeName = `#attr${i}`;
      expression += `${attributeName} = :val${i}${
        i < Object.keys(userData).length - 1 ? "," : ""
      } `;
      // @ts-ignore
      values[`:val${i}`] = userData[key];
      names[attributeName] = key;
    }
  });
  params["UpdateExpression"] = expression;
  params["ExpressionAttributeValues"] = values;
  params["ExpressionAttributeNames"] = names;

  // Perform update
  await docClient.update(params).promise();

  // Return updated user
  return await getUser(id);
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Get HTTP method from the event
  const method = event.httpMethod;

  // Get the api path as an array.
  const pathAsArray = event.path.split("/");

  // Get scope, to know if we're performing actions on the user or the cart
  const scope: "user" | "cart" =
    pathAsArray[pathAsArray.length - 1] === "cart" ? "cart" : "user";

  try {
    // GET cart method
    if (method === "GET" && scope === "cart") {
      // Get the user's cart
      const cart = await getUserCart(event.pathParameters!.id!);

      // Return method's response
      return {
        body: JSON.stringify({
          cart,
          message: "Success",
        }),
        statusCode: 200,
      };

      // GET user method
    } else if (method === "GET" && scope === "user") {
      // Get the user
      const user = await getUser(event.pathParameters!.id!);

      // Return method's response
      return {
        body: JSON.stringify({
          user,
          message: "Success",
        }),
        statusCode: 200,
      };

      // POST Method
    } else if (method === "POST" && scope === "user") {
      // Get data from body
      const { email, name, id } = JSON.parse(event.body!)
        .userData as Partial<User>;

      // Make sure data is present in body
      if (!email || !name || !id)
        return {
          statusCode: 400,
          body: "Please provide body in format '{ 'userData': { 'email':string, 'name':string, 'id':string } }'",
        };

      // Create user
      const user = await createUser(id, email, name);

      // Return method's response
      return {
        body: JSON.stringify({ user: user, message: "Success" }),
        statusCode: 200,
      };

      // PATCH method
    } else if (method === "PATCH" && scope === "cart") {
      // Get data from body
      const { newCart } = JSON.parse(event.body!) as {
        newCart: Cart;
      };

      // Perform update
      const user = await updateUser(event.pathParameters!.id!, {
        cart: newCart,
      });

      // Return 404 if there was not such user
      if (!user)
        return {
          body: JSON.stringify({ cart: undefined, message: "User not found" }),
          statusCode: 404,
        };

      // Return method's response
      return {
        body: JSON.stringify({ cart: user.cart, message: "Success" }),
        statusCode: 200,
      };
    } else if (method === "PATCH" && scope === "user") {
      // Get data from body
      const { userData } = JSON.parse(event.body!) as {
        userData: Partial<User>;
      };

      // Perform update
      const user = await updateUser(event.pathParameters!.id!, userData);

      // Return method's response
      return {
        body: JSON.stringify({ user: user, message: "Success" }),
        statusCode: 200,
      };
    }
    return { body: '{"message": "Not such endpoint"}', statusCode: 502 };
  } catch (error) {
    console.log(error);
    return {
      body: `{"error": ${(error as Error).toString()}}`,
      statusCode: 502,
    };
  }
};
