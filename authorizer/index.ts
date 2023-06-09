import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  return {
    body: JSON.stringify({
      message: "Hello from authorizer",
      data: event.body,
    }),
    statusCode: 200,
  };
};
