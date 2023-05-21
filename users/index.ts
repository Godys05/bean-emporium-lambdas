// TODO
// - Handle error codes and add constraints
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";
import { User } from "../types";
import * as AWS from "aws-sdk";

const docClient = new AWS.DynamoDB.DocumentClient();
const userUpdatableProperties = ["name", "email"];

const getUser = async (id: string) => {
  try {
    const params = {
      TableName: "BeanUsers",
      Key: { id },
    };

    const data = await docClient.get(params).promise();
    return { data, message: "User successfully retrieved." };
  } catch (error) {
    return { error };
  }
};

const createUser = async (user: Partial<User>) => {
  try {
    const params = {
      TableName: "BeanUsers",
      Item: { ...user },
    };

    await docClient.put(params).promise();
    return { data: user, message: "User successfully created." };
  } catch (error) {
    console.log(error);
    return { error };
  }
};

const updateUser = async (id: string, user: Partial<User | any>) => {
  try {
    let params: any = {
      TableName: "BeanUsers",
      Key: { id },
      ReturnValues: "ALL_NEW",
    };

    let expression = "set ";
    let values = {};

    Object.keys(user).forEach((key, i) => {
      if (userUpdatableProperties.indexOf(key) !== -1) {
        expression += `${key} = :${key} ${
          i < Object.keys(user).length - 1 ? "," : ""
        } `;
        values = { ...values, [`:${key}`]: user[key] };
      }
    });

    params["UpdateExpression"] = expression;
    params["ExpressionAttributeValues"] = values;

    const data = await docClient.update(params).promise();
    return { data, message: "User successfully updated." };
  } catch (error) {
    console.log(error);
    return { error: error };
  }
};

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  let data: any = {};
  const method = event.httpMethod;
  let user;
  try {
    switch (method) {
      case "GET":
        data = await getUser(event.pathParameters!.id!);
        break;
      case "POST":
        user = JSON.parse(event.body!).user;
        data = await createUser(user);
        break;
      case "PATCH":
        user = JSON.parse(event.body!).user;
        data = await updateUser(event.pathParameters!.id!, user);
        break;
      default:
        break;
    }

    if (Object.keys(data).length === 0) {
      return { statusCode: 404, body: "User with given ID not found" };
    }
    return { body: JSON.stringify(data), statusCode: 200 };
  } catch (error) {
    console.log(error);
    return { body: "", statusCode: 502 };
  }
};
