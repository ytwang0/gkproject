# gkproject

部署在阿里云服务器上的 Spring Boot 网页原型。

## 本地运行

需要 JDK 17 和 Maven 3.6.3+。

```bash
mvn -DskipTests package
java -jar target/web-prototype-0.1.0.jar
```

启动后访问 <http://localhost:8081>。

## 接口

- `/` 首页
- `/api/health` 健康检查
- `/api/info` 应用与服务器信息

## 线上

当前通过 Nginx 反向代理对外提供访问，应用以 systemd 服务 `springboot-prototype` 运行。
