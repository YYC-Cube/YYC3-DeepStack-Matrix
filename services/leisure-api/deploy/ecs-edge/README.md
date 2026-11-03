# ECS 边缘配置快照(现网固化副本)

> 2026-11-03 投产稳定性批次:边缘配置从 ECS 拉取入仓,机器重装/漂移时可依此重建。
> **以现网为准**:每次变更边缘配置后,必须回写本目录并提交(否则仓内快照过期)。

| 本仓文件 | ECS 现网路径 | 变更后生效方式 |
| --- | --- | --- |
| `nginx.conf` | `/root/yyc3-leisure-edge/nginx.conf`(bind mount → 容器 `/etc/nginx/conf.d/default.conf`) | ⚠️ **单文件 mount inode 固定:`docker compose restart edge` 才生效**(reload 无效);详见 005 号 |
| `docker-compose.yml` | `/root/yyc3-leisure-edge/docker-compose.yml` | `docker compose up -d` |
| `traefik/traefik.yml` | `/root/0379-world/traefik/traefik.yml`(Traefik 静态配置) | 容器重建 |
| `traefik/dynamic.yml` | `/root/0379-world/traefik/dynamic.yml`(路由/证书) | 热加载(观察 `docker logs traefik-1`) |
| `frps.toml.example` | `/root/frps/frps.toml` | `systemctl restart frps`(模板脱敏;真值只存各机 600 文件) |

## 链路依赖(ECS 本机)

- **socat 中继** systemd `yyc3-leisure-8802-relay`(172.17.0.1:8802 → 环回 8802):边缘容器 → Mac API 隧道的必经环节;`systemctl status yyc3-leisure-8802-relay` 巡检;定义见 005 号已知问题。
- frps 监听 `*:8800/8801/...`(allowPorts 8800-8810 等);Mac 反向隧道绑定 ECS **环回** 8802(非 frps 通道)。

## 快速重建(机器重装)

1. 恢复本目录各文件到上表路径(`frps.toml.example` → 填回真值)
2. `cd /root/yyc3-leisure-edge && docker compose up -d`
3. 建 socat 中继 systemd(005 号有完整定义)并 `enable --now`
4. 验证:`curl -H 'Host: lm.0379.world' http://127.0.0.1:8070/api/v1/attendance/realtime` → 401
