# danmanners.com — local dev/build tasks
# Run `just` with no args to list recipes.

# Start the dev server in the background (http://localhost:4321)
dev:
    npx astro dev --background

# Show the background dev server's status
status:
    npx astro dev status

# Stream the background dev server's logs
logs:
    npx astro dev logs

# Stop the background dev server
stop:
    npx astro dev stop

# Production build (output in dist/)
build:
    npx astro build

# Serve the production build locally (after `just build`)
preview:
    npx astro preview

# Type-check the project
check:
    npx astro check
