# Pull five mobile VR / AR headlines from public feeds.
# X's read API is paid, so this uses open RSS only.

import html
import json
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "news.json"
UA = "wmavr-news/1.0 (+https://wmavr.com)"
WANT = 5
FRESH = timedelta(days=10)
FALLBACK = timedelta(days=30)

FEEDS = [
    ("UploadVR", "https://www.uploadvr.com/feed/"),
    ("Road to VR", "https://www.roadtovr.com/feed/"),
    ("Mixed", "https://mixed-news.com/feed/"),
    (
        "Google 新闻",
        "https://news.google.com/rss/search?q="
        "Quest+OR+PICO+OR+XREAL+OR+Rokid+OR+Viture+OR+%22Ray-Ban%22+OR+"
        "%22Android+XR%22+OR+%22Vision+Pro%22+OR+%22AR+glasses%22+OR+"
        "%22VR+%E7%9C%BC%E9%95%9C%22+OR+%22AR+%E7%9C%BC%E9%95%9C%22"
        "&hl=zh-CN&gl=CN&ceid=CN:zh-Hans",
    ),
]

INCLUDE = re.compile(
    r"("
    r"\bquests?\b|\bpico\b|奇遇|\bxreal\b|\bnreal\b|\bviture\b|\brokid\b|雷鸟|"
    r"ray[-\s]?ban|\bspectacles\b|vision pro|android xr|galaxy xr|horizon os|"
    r"cardboard|gear vr|daydream|smart glasses|ar glasses|vr glasses|"
    r"mixed reality|头显|一体机|头戴|眼镜|空间计算|spatial computing|"
    r"\bheadset\b|\boculus\b|play for dream|玩出梦想|project aura|moohan|"
    r"magic leap|lynx headset"
    r")",
    re.I,
)
EXCLUDE = re.compile(
    r"(dragon quest|quest diagnostics|quest nutrition|pico de gallo|"
    r"\brtx\b|geforce|显卡|graphics card|steam frame|valve index|bigscreen|pimax|"
    r"快闪|小学|社团|科普实践|进校园|研学|党日|消防|亲子|伴童|教师培训)",
    re.I,
)
CLUSTERS = [
    (re.compile(r"meta", re.I), re.compile(r"120|1\.2\s*亿|第三方")),
    (re.compile(r"android xr", re.I), re.compile(r"开售|december|12月|gentle|warby", re.I)),
    (re.compile(r"apple|苹果", re.I), re.compile(r"glasses|眼镜|siri", re.I)),
    (re.compile(r"雷鸟", re.I), re.compile(r"blg|免单|退款|夺冠")),
]


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as response:
        return response.read()


def local(tag):
    return tag.rsplit("}", 1)[-1]


def text_of(node):
    if node is None:
        return ""
    return html.unescape("".join(node.itertext())).strip()


def when(item):
    for child in item:
        name = local(child.tag)
        if name not in ("pubDate", "date", "updated", "published"):
            continue
        raw = text_of(child)
        if not raw:
            continue
        try:
            parsed = parsedate_to_datetime(raw)
        except (TypeError, ValueError):
            try:
                parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
            except ValueError:
                continue
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)
    return None


def source_of(item, feed_name):
    for child in item:
        if local(child.tag) == "source" and text_of(child):
            return text_of(child)
    return feed_name


def link_of(item):
    for child in item:
        name = local(child.tag)
        if name == "link":
            href = child.attrib.get("href") or text_of(child)
            if href:
                return href.strip()
    return ""


def title_of(item):
    for child in item:
        if local(child.tag) == "title":
            return re.sub(r"\s+", " ", text_of(child))
    return ""


def clean_title(title, source):
    suffix = " - " + source
    if source and title.endswith(suffix):
        return title[: -len(suffix)].strip()
    return title


def key_of(title):
    cleaned = re.sub(r"\s+-\s+[^-]+$", "", title)
    return re.sub(r"[^0-9a-zA-Z\u4e00-\u9fff]+", "", cleaned).lower()


def matches(title):
    if not INCLUDE.search(title):
        return False
    if EXCLUDE.search(title):
        return False
    return True


def collect():
    found = []
    errors = []
    for feed_name, url in FEEDS:
        try:
            root = ET.fromstring(fetch(url))
        except Exception as error:
            errors.append(feed_name + ": " + str(error))
            continue
        for item in root.iter():
            if local(item.tag) not in ("item", "entry"):
                continue
            title = title_of(item)
            link = link_of(item)
            published = when(item)
            if not title or not link or published is None or not matches(title):
                continue
            found.append({
                "title": title,
                "url": link,
                "source": source_of(item, feed_name),
                "published": published,
            })
    return found, errors


def cluster_of(title):
    for index, (left, right) in enumerate(CLUSTERS):
        if left.search(title) and right.search(title):
            return index
    return None


def score(item):
    title = item["title"]
    value = 0
    if re.search(r"眼镜|glasses|android xr|vision pro|销量|融资|开售|发布|launch|funding|commits", title, re.I):
        value += 6
    if re.search(r"quest|pico|xreal|雷鸟|rokid|ray-ban|viture|galaxy xr", title, re.I):
        value += 3
    if item["source"] in ("UploadVR", "Road to VR", "Mixed", "凤凰网", "凤凰网科技", "VR陀螺"):
        value += 2
    if re.search(r"strap|comes to|game awards|线下|体验活动", title, re.I):
        value -= 4
    age = (datetime.now(timezone.utc) - item["published"]).days
    return value - min(age, 12)


def pick(found, now):
    ranked = sorted(found, key=score, reverse=True)
    chosen = []
    seen = set()
    clusters = set()

    def take(window, per_source):
        counts = {}
        for item in ranked:
            if now - item["published"] > window:
                continue
            identity = key_of(item["title"])
            if not identity or identity in seen:
                continue
            cluster = cluster_of(item["title"])
            if cluster is not None and cluster in clusters:
                continue
            source = item["source"]
            if counts.get(source, 0) >= per_source:
                continue
            seen.add(identity)
            if cluster is not None:
                clusters.add(cluster)
            counts[source] = counts.get(source, 0) + 1
            chosen.append(item)
            if len(chosen) >= WANT:
                return

    take(FRESH, 2)
    if len(chosen) < WANT:
        take(FALLBACK, 2)
    if len(chosen) < WANT:
        take(FALLBACK, WANT)
    chosen.sort(key=lambda item: item["published"], reverse=True)
    return chosen[:WANT]


def main():
    now = datetime.now(timezone.utc)
    found, errors = collect()
    chosen = pick(found, now)
    for error in errors:
        print("skip " + error, file=sys.stderr)
    if len(chosen) < WANT:
        print("only " + str(len(chosen)) + " headlines", file=sys.stderr)
        return 1
    payload = {
        "updated": now.astimezone(timezone(timedelta(hours=8))).date().isoformat(),
        "note": "每天从公开订阅源更新 5 条。只收一体机、手机盒子和 AR 眼镜，不含显卡。X 的读取接口不开放，所以没有接 X。",
        "items": [
            {
                "title": clean_title(item["title"], item["source"]),
                "url": item["url"],
                "source": item["source"],
                "published": item["published"].astimezone(timezone(timedelta(hours=8))).date().isoformat(),
            }
            for item in chosen
        ],
    }
    previous = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
    rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    same_links = False
    if previous:
        try:
            old = json.loads(previous)
            same_links = [item["url"] for item in old.get("items", [])] == [item["url"] for item in payload["items"]]
        except ValueError:
            same_links = False
    if same_links:
        print("unchanged")
        return 0
    OUT.write_text(rendered, encoding="utf-8")
    print("wrote " + str(len(payload["items"])))
    return 0


if __name__ == "__main__":
    sys.exit(main())
