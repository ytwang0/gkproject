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

代码以 GitHub 仓库 [ytwang0/gkproject](https://github.com/ytwang0/gkproject) 为准。服务器每分钟检查一次 `main` 分支，发现新提交后会自动拉取、构建并重启服务。把改动推到 `main` 即可更新线上，不要在服务器上直接改代码（拉取时会覆盖本地修改）。

也可以在服务器上手动执行：

```bash
gkproject-deploy          # 有新提交才构建重启
gkproject-deploy --force  # 按当前仓库版本强制重建
```

部署日志可在服务器上查看：`journalctl -u gkproject-deploy.service -n 50`
