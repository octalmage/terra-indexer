#!/bin/bash
docker run -p 6379:6379 --rm --name redis-indexer -d redis 
docker run -d --name mongo-indexer -p 27017:27017 -e MONGO_INITDB_ROOT_USERNAME=mongoadmin -e MONGO_INITDB_ROOT_PASSWORD=secret mongo
