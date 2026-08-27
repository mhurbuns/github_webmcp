import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles.css";
import { RepositoryApp } from "./application/repositoryApp";
import { fixtureRepository } from "./data/fixtureRepository";
import { registerRepositoryTools, type WebMcpStatus } from "./webmcp/registerTools";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element");

const root = createRoot(rootElement);
const repositoryApp = new RepositoryApp(fixtureRepository);
let status: WebMcpStatus = "checking";

function render() {
  root.render(<App repositoryApp={repositoryApp} webMcpStatus={status} />);
}

render();

const registration = registerRepositoryTools(repositoryApp).then((result) => {
  status = result.status;
  render();
  return result;
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void registration.then(({ dispose }) => dispose());
  });
}
