import { ExpressServer } from './express-server';

/* Instantiate ExpressServer and listen to port 3000. */
const server = new ExpressServer();
server.connect({
    port: 3000
});
