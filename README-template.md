# AbstractServer
The idea behind AbstractServer is to abstract the logic of a Node.js server from the actual implementation which typically depends on a specific framework e.g. Express. This way it's easier to replace the framework if required since the logic doesn't have to be implemented again. To realize this idea, the logical parts of the server are usually implemented by a class derived from AbstractServer. However, this class (let's call it AppServer) does not implement the server framework's specific functions but rather keeps them abstract as well. Finally, a third class (let's call it ExpressServer) derives from AppServer and implements the functions which are framework specific. This might seem tedious at the beginning but saves a lot of time if the framework needs to be changed or gets outdated. *Please feel free to participate on this project as I'm pretty sure there's still a lot to improve.*

## AppServer
```typescript
<load:example/app-server.ts>
```

## ExpressServer
```typescript
<load:example/express-server.ts>
```
