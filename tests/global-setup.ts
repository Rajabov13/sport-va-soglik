import path from "node:path";
import { prepareTestDb } from "./prepare-db";

/** Fresh SQLite test database with all migrations applied (never touches the app database). */
export default function setup() {
  prepareTestDb(`file:${path.resolve(".tmp/test.db")}`);
}
