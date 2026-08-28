import { createRoot } from "react-dom/client";
import { App } from "./app/App";
import "./app/styles.css";
import { RepositoryApp } from "./application/repositoryApp";
import { fixtureRepository } from "./data/fixtureRepository";
import { registerRepositoryTools } from "./webmcp/registerTools";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Missing root element");

const root = createRoot(rootElement);
const repositoryApp = new RepositoryApp(fixtureRepository);
root.render(<App repositoryApp={repositoryApp} />);

const registration = registerRepositoryTools(repositoryApp).then((result) => {
  return result;
});

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    void registration.then(({ dispose }) => dispose());
  });
}
