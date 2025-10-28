.PHONY: new

setup: 
	@echo "Copying .env file..."
	@cp ~/git/personal/typing-trainer/.env .
	@echo "Installing dependencies..."
	@npm i
	@echo "Building..."
	@npm run build
	
start:
	@echo "Starting development server..."
	@npm run dev

clean:
	@echo "Cleaning..."
	@rm -rf .next
	@rm -rf node_modules