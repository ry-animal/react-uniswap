# Variables
DOCKER_IMAGE_NAME = react-sl-swapper
DOCKER_CONTAINER_NAME = react-vite-container
HOST_PORT = 8080
CONTAINER_PORT = 80

# Phony targets
.PHONY: build run stop clean

# Build the Docker image
build:
	docker build -t $(DOCKER_IMAGE_NAME) .

# Run the Docker container
run:
	docker run -d -p $(HOST_PORT):$(CONTAINER_PORT) --name $(DOCKER_CONTAINER_NAME) $(DOCKER_IMAGE_NAME)

# Stop and remove the Docker container
stop:
	docker stop $(DOCKER_CONTAINER_NAME)
	docker rm $(DOCKER_CONTAINER_NAME)

# Clean up Docker image
clean:
	docker rmi $(DOCKER_IMAGE_NAME)

# Development commands
install:
	npm install

dev:
	npm run dev

test:
	npx vitest

build-app:
	npm run build

# All-in-one command for Docker deployment
deploy: build run

# All-in-one command to stop and clean up
teardown: stop clean