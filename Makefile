.PHONY: new

new:
	@echo "Copying .env file..."
	@cp ~/git/personal/typing-trainer/.env .
	@echo "Installing dependencies..."
	@npm i
	@echo "Starting development server..."
	@npm run dev

