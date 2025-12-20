#!/bin/bash

# OpenBench Development Helper Script

set -e

case "${1:-up}" in
  up)
    echo "🚀 Starting OpenBench in development mode..."
    docker-compose -f docker-compose.dev.yml up
    ;;
  
  build)
    echo "🔨 Building and starting OpenBench in development mode..."
    docker-compose -f docker-compose.dev.yml up --build
    ;;
  
  down)
    echo "🛑 Stopping OpenBench development environment..."
    docker-compose -f docker-compose.dev.yml down
    ;;
  
  restart)
    echo "🔄 Restarting OpenBench development environment..."
    docker-compose -f docker-compose.dev.yml restart
    ;;
  
  logs)
    service="${2:-}"
    if [ -z "$service" ]; then
      echo "📋 Showing all logs..."
      docker-compose -f docker-compose.dev.yml logs -f
    else
      echo "📋 Showing logs for $service..."
      docker-compose -f docker-compose.dev.yml logs -f "$service"
    fi
    ;;
  
  *)
    echo "OpenBench Development Helper"
    echo ""
    echo "Usage: ./dev.sh [command]"
    echo ""
    echo "Commands:"
    echo "  up       - Start development environment (default)"
    echo "  build    - Build and start development environment"
    echo "  down     - Stop development environment"
    echo "  restart  - Restart development environment"
    echo "  logs     - Show logs (add 'frontend' or 'backend' to filter)"
    echo ""
    echo "Examples:"
    echo "  ./dev.sh              # Start dev environment"
    echo "  ./dev.sh build        # Build and start"
    echo "  ./dev.sh logs         # View all logs"
    echo "  ./dev.sh logs backend # View backend logs only"
    exit 1
    ;;
esac

