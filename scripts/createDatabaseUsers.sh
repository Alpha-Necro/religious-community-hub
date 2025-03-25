#!/bin/bash

# Load environment variables
source .env

# Create development database and user
psql postgres -c "CREATE USER $DB_DEV_USER WITH PASSWORD '$DB_DEV_PASSWORD';"
psql postgres -c "CREATE DATABASE $DB_NAME;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_DEV_USER;"

# Create test database and user
psql postgres -c "CREATE USER $DB_TEST_USER WITH PASSWORD '$DB_TEST_PASSWORD';"
psql postgres -c "CREATE DATABASE $DB_TEST_NAME;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_TEST_NAME TO $DB_TEST_USER;"

# Create production database and user
psql postgres -c "CREATE USER $DB_PRODUCTION_USER WITH PASSWORD '$DB_PRODUCTION_PASSWORD';"
psql postgres -c "CREATE DATABASE $DB_PRODUCTION_NAME;"
psql postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_PRODUCTION_NAME TO $DB_PRODUCTION_USER;"

echo "Database users and databases created successfully!"
