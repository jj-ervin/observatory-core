#!/usr/bin/env bash
set -euo pipefail
image="${1:?image required}"
root="$(mktemp -d "$PWD/.scratch/container-smoke.XXXXXX")"
name="oc-smoke-$$"
cleanup(){ docker rm -f "$name" >/dev/null 2>&1 || true; sudo rm -rf "$root"; }
trap cleanup EXIT
mkdir "$root/data" "$root/backup"
token="$(node -e 'process.stdout.write(require("node:crypto").randomBytes(32).toString("base64url"))')"
export OC_SMOKE_TOKEN="$token"
node --input-type=module - "$root/api.json" <<'JS'
import {writeFileSync} from 'node:fs';
writeFileSync(process.argv[2],JSON.stringify({port:8787,archive:'/data/archive.sqlite',audit:'/data/research-audit.sqlite',workspace:{evidence:'/data/evidence.sqlite',discovery:'/data/news.json',operationAudit:'/data/api-audit.sqlite'},principals:[{subject:'container-fixture',token:process.env.OC_SMOKE_TOKEN,documentIds:[],actions:[],permissions:['evidence:read','evidence:write','discovery:read','discovery:write']}]}),{mode:0o600});
JS
sudo chown -R 1000:1000 "$root/data" "$root/api.json"
sudo chmod 0700 "$root/data"
flags=(--network none --read-only --cap-drop ALL --security-opt no-new-privileges --pids-limit 64 --memory 512m --cpus 1 --tmpfs /tmp:rw,noexec,nosuid,nodev,size=16m)
run_api(){ docker run -d --name "$name" "${flags[@]}" -v "$root/data:/data" -v "$root/api.json:/run/observatory/api.json:ro" "$1" api >/dev/null; }
healthy(){ for i in $(seq 1 35); do if docker exec "$name" node /opt/observatory/src/container/health.mjs; then return 0; fi; sleep 1; done; docker logs "$name"; return 1; }
client(){ docker exec -i -e OC_SMOKE_TOKEN "$name" node --input-type=module - "$1" <<'JS'
import assert from 'node:assert/strict';
import {writeFileSync} from 'node:fs';
assert.equal(process.getuid(),1000);
assert.throws(()=>writeFileSync('/opt/observatory/probe','x'));
const call=async(path,body,token=process.env.OC_SMOKE_TOKEN)=>fetch('http://127.0.0.1:8787/v1/'+path,{method:'POST',headers:{'content-type':'application/json',authorization:'Bearer '+token},body:JSON.stringify(body)});
assert.equal((await call('evidence/list',{},'invalid')).status,401);
if(process.argv[2]==='seed'){
 const record={schemaVersion:'0.1.0',recordType:'source',id:'container',version:1,createdAt:'2026-01-01T00:00:00Z',producer:'fixture',locator:'https://example.org',sourceType:'web',displayName:'Container fixture'};
 assert.equal((await call('evidence/append',{record})).status,200);
 assert.equal((await call('discovery/ingest',{providerId:'rss',items:[{url:'https://example.org/paper',title:'Fixture'}]})).status,200);
}
const response=await call('evidence/get',{ref:'source:container@1'});assert.equal(response.status,200);assert.equal((await response.json()).result.displayName,'Container fixture');
const discovery=await call('discovery/list',{});assert.equal(discovery.status,200);assert.equal((await discovery.json()).result.items[0].title,'Fixture');
assert.equal((await call('discovery/collect',{providerId:'rss'})).status,403);
JS
}
run_api "$image"; healthy; client seed
docker inspect "$name" --format '{{.HostConfig.NetworkMode}} {{.HostConfig.ReadonlyRootfs}} {{.Config.User}}' | grep -Fx 'none true 1000:1000'
docker stop -t 30 "$name" >/dev/null
test "$(docker inspect "$name" --format '{{.State.ExitCode}}')" = 0
docker rm "$name" >/dev/null
sudo cp -a "$root/data/." "$root/backup/"
run_api "$image"; healthy; client verify
docker stop -t 30 "$name" >/dev/null; docker rm "$name" >/dev/null
# Recreate data from a quiescent backup and verify recovery.
sudo rm -rf "$root/data"; sudo mkdir "$root/data"; sudo cp -a "$root/backup/." "$root/data/"; sudo chown -R 1000:1000 "$root/data"
run_api "$image"; healthy; client verify
docker stop -t 30 "$name" >/dev/null; docker rm "$name" >/dev/null
docker run --rm "${flags[@]}" "$image" cli --version | grep -Fx '1.2.0'
echo 'Container identity, offline API, denial, persistence, restart, backup restore and CLI passed'
