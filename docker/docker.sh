#!/bin/bash
set -e

readonly PROJECT_NAME="faztore"
readonly COMPOSE_FILE="docker/docker-compose.yml"
COMPOSE_CMD=""

check_docker() {
    command -v docker &> /dev/null || { echo "Docker not installed"; exit 1; }

    if command -v docker-compose &> /dev/null; then
        COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        COMPOSE_CMD="docker compose"
    else
        echo "Docker Compose not installed"
        exit 1
    fi

    docker info &> /dev/null || { echo "Docker daemon not running"; exit 1; }
}

check_compose_file() {
    [[ -f "$COMPOSE_FILE" ]] || { echo "Docker Compose file not found"; exit 1; }
}

compose() {
    # shellcheck disable=SC2086
    $COMPOSE_CMD -f "$COMPOSE_FILE" "$@"
}

cmd_build() {
    compose build
}

cmd_up() {
    compose up -d
}

cmd_down() {
    compose down
}

cmd_restart() {
    cmd_down && cmd_up
}

cmd_logs() {
    compose logs -f
}

cmd_shell() {
    docker exec -it "${PROJECT_NAME}_app" /bin/sh
}

cmd_pnpm() {
    shift
    docker exec -it "${PROJECT_NAME}_app" pnpm "$@"
}



cmd_db_shell() {
    docker exec -it "${PROJECT_NAME}_postgres" psql -U postgres -d "$PROJECT_NAME"
}

containers_running() {
    compose ps --status running --services | grep -q .
}

cmd_setup() {
    containers_running || { echo "Containers not running. Run: ./docker.sh up"; exit 1; }
    docker exec -it "${PROJECT_NAME}_app" bash database/dev/setup.sh
}



check_containers() {
    containers_running || { echo "Containers not running. Run: ./docker.sh up"; exit 1; }
}

cmd_db_migrate() {
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run db:migrate
}

cmd_db_rollback() {
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run db:rollback
}

cmd_db_status() {
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run db:status
}

cmd_db_generate() {
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run db:generate
}

cmd_db_create() {
    shift
    [ $# -eq 0 ] && { echo "Migration name required"; exit 1; }
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run db:create "$@"
}

cmd_status() {
    compose ps
}

cmd_test() {
    check_containers
    docker exec -it "${PROJECT_NAME}_app" pnpm run test
}

show_help() {
    cat << EOF
Faztore Docker Management

Usage: ./docker.sh [command]

Quick Start: ./docker.sh build && ./docker.sh up && ./docker.sh setup

Commands:
  build           Build images
  up              Start services
  down            Stop services
  restart         Restart services
  logs            View logs
  status          Show status
  shell           App shell
  pnpm            Run pnpm commands
  test            Run tests

Database:
  setup           Bootstrap database (init if empty + migrate + typegen)
  db:shell        PostgreSQL shell
  db:migrate      Run migrations only
  db:rollback     Rollback migrations
  db:status       Migration status
  db:generate     Generate types
  db:create       Create migration
EOF
}

main() {
    check_docker
    check_compose_file

    case "${1:-help}" in
        "build")        cmd_build ;;
        "up")           cmd_up ;;
        "down")         cmd_down ;;
        "restart")      cmd_restart ;;
        "logs")         cmd_logs ;;
        "status")       cmd_status ;;
        "shell")        cmd_shell ;;
        "pnpm")         cmd_pnpm "$@" ;;
        "test")         cmd_test ;;
        "setup")        cmd_setup ;;
        "db:shell")     cmd_db_shell ;;
        "db:migrate")   cmd_db_migrate ;;
        "db:rollback")  cmd_db_rollback ;;
        "db:status")    cmd_db_status ;;
        "db:generate")  cmd_db_generate ;;
        "db:create")    cmd_db_create "$@" ;;
        "help"|"-h"|"--help") show_help ;;
        *)              echo "Unknown command: $1"; show_help; exit 1 ;;
    esac
}

main "$@"
