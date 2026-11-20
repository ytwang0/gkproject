# gkproject

部署在阿里云服务器上的 Spring Boot 网页原型。

## 本地运行

需要 JDK 17、Maven 3.6.3+，以及可连接的 MySQL 8.0。启动前要设置数据库环境变量，见下方「数据库」。

```bash
mvn -DskipTests package
java -jar target/web-prototype-0.1.0.jar
```

启动后访问 <http://localhost:8081>。

## 接口

- `/` 首页
- `/api/health` 健康检查（进程存活，不查数据库）
- `/api/info` 应用与服务器信息
- `/api/db` 数据库连接（`SELECT 1` 和当前库名）

## 数据库

应用通过 JDBC 连接同一台机器上的 MySQL 8.0。库名和用户名都是 `gkproject`，字符集 `utf8mb4` / `utf8mb4_unicode_ci`，时区用 `serverTimezone=Asia/Shanghai`。

连接信息只从环境变量读取。密码没有默认值，必须由环境变量提供，不要写进 `application.properties`，不要提交 `.env` 或真实口令。

| 变量 | 作用 |
| --- | --- |
| `DB_URL` | JDBC 地址。不设置时使用下面的本机默认地址 |
| `DB_USERNAME` | 用户名。不设置时为 `gkproject` |
| `DB_PASSWORD` | 密码。必填，没有默认值 |

默认 JDBC 地址：

```text
jdbc:mysql://127.0.0.1:3306/gkproject?useUnicode=true&characterEncoding=utf8&connectionCollation=utf8mb4_unicode_ci&serverTimezone=Asia/Shanghai
```

本地启动示例：

```bash
export DB_URL='jdbc:mysql://127.0.0.1:3306/gkproject?useUnicode=true&characterEncoding=utf8&connectionCollation=utf8mb4_unicode_ci&serverTimezone=Asia/Shanghai'
export DB_USERNAME='gkproject'
export DB_PASSWORD='你的密码'

mvn -DskipTests package
java -jar target/web-prototype-0.1.0.jar
```

未设置密码、密码错误或数据库连不上时，进程会启动失败。线上由 systemd 服务 `springboot-prototype` 的 `EnvironmentFile` 注入这三个变量，该文件不在仓库里。

`/api/health` 在进程起来后仍返回 200。数据库是否可用看 `/api/db`。

## 小游戏

首页有「进入游戏厅」。三款游戏都是浏览器里的 HTML/CSS/JS，不写服务器分数，也不增加依赖。

- `/games` 游戏厅
- `/games/snake` 贪吃蛇
- `/games/2048` 2048
- `/games/breakout` 打砖块

## 线上

当前通过 Nginx 反向代理对外提供访问，应用以 systemd 服务 `springboot-prototype` 运行。

代码以 GitHub 仓库 [ytwang0/gkproject](https://github.com/ytwang0/gkproject) 为准。服务器每分钟检查一次 `main` 分支，发现新提交后会自动拉取、构建并重启服务。把改动推到 `main` 即可更新线上，不要在服务器上直接改代码（拉取时会覆盖本地修改）。

也可以在服务器上手动执行：

```bash
gkproject-deploy          # 有新提交才构建重启
gkproject-deploy --force  # 按当前仓库版本强制重建
```

部署日志可在服务器上查看：`journalctl -u gkproject-deploy.service -n 50`
