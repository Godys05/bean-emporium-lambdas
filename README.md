# bean-emporium-lambdas

## How to update lambda functions

1. Change the *entry* field in **webpack.config.js** file for the function you are working with (i.e *./users.ts*)
2. do `npm run build`
3. Create a zip file out of the new dist folder that has been created `zip -r <FILE_NAME>.zip dist`
4. Update your lambda function with `aws lambda update-function-code --function-name <LAMBDA_NAME> --zip-file fileb://<FILE_NAME>.zip`
