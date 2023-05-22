import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from "aws-lambda";

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  // Endpoints to create:
  // /products
  //     POST
  //     GET (?page=0&size=10)
  //     {id}
  //         GET
  //         PATCH
  //         DELETE
  return {
    body: JSON.stringify({ message: "Hello from products", data: event.body }),
    statusCode: 200,
  };
};
