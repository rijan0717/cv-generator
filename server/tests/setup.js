/**
 * Global test setup. Loads a predictable set of environment variables so the
 * server's config module never depends on the developer's real `.env`.
 */
process.env.NODE_ENV = 'test';
process.env.PORT = '5001';
process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/cv_generator_test';
process.env.JWT_SECRET = 'test_jwt_secret_value_for_unit_and_integration_tests';
process.env.PRINT_TOKEN_SECRET = 'test_print_token_secret_value';
