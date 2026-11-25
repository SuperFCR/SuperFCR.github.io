import json
import os
import re
from pathlib import Path
from urllib.parse import parse_qs, urlparse


SCHOLAR_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0.0.0 Safari/537.36"
    )
}
PLACEHOLDER_SCHOLAR_IDS = {"", "YOUR_ID", "YOUR_SCHOLAR_ID"}
PLACEHOLDER_GITHUB_OWNERS = {"yourusername", "your-username", "example", "your-org"}


def write_json_atomic(path, data):
    """Write generated data without risking a partially written cache file."""
    path = Path(path)
    temporary_path = path.with_suffix(f"{path.suffix}.tmp")
    with temporary_path.open("w", encoding="utf-8") as output:
        json.dump(data, output, ensure_ascii=False, indent=2)
        output.write("\n")
    os.replace(temporary_path, path)


def scholar_id_from_config(config_path):
    try:
        with Path(config_path).open("r", encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not read configuration: {error}") from error

    scholar_url = (data.get("personal") or {}).get("googleScholar", "")
    if not scholar_url:
        return None
    query = parse_qs(urlparse(scholar_url).query)
    user_ids = query.get("user", [])
    author_id = user_ids[0].strip() if user_ids else ""
    if not author_id or author_id in PLACEHOLDER_SCHOLAR_IDS:
        return None
    return author_id


def fetch_scholar_data(author_id):
    if not author_id:
        print("ℹ️ [Scholar] No Google Scholar user ID configured; skipping Scholar fetch.")
        return None

    import requests
    from bs4 import BeautifulSoup

    print(f"🚀 [Scholar] Starting fetch for ID: {author_id}")
    url = f"https://scholar.google.com/citations?user={author_id}&hl=en"

    try:
        response = requests.get(url, headers=SCHOLAR_HEADERS, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, "html.parser")
        stats = soup.find_all("td", class_="gsc_rsb_std")
        if len(stats) >= 3:
            print(
                "✅ [Scholar] Success! "
                f"Citations: {stats[0].text}, h-index: {stats[2].text}"
            )
            return {"citedby": stats[0].text, "h_index": stats[2].text}
        print("⚠️ [Scholar] Statistics were not present in the response.")
    except requests.RequestException as error:
        print(f"❌ [Scholar] Error: {error}")
    return None


def github_session():
    import requests
    from requests.adapters import HTTPAdapter
    from urllib3.util.retry import Retry

    retry_policy = Retry(
        total=3,
        connect=3,
        read=3,
        status=3,
        backoff_factor=1,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=("GET",),
        respect_retry_after_header=True,
    )
    session = requests.Session()
    session.mount("https://", HTTPAdapter(max_retries=retry_policy))
    session.headers.update(
        {
            "Accept": "application/vnd.github+json",
            "User-Agent": "academic-homepage-updater",
            "X-GitHub-Api-Version": "2022-11-28",
        }
    )

    token = os.environ.get("GITHUB_TOKEN")
    if token:
        session.headers["Authorization"] = f"Bearer {token}"
    return session


def repositories_from_config(config_path):
    try:
        with Path(config_path).open("r", encoding="utf-8") as config_file:
            data = json.load(config_file)
    except (OSError, json.JSONDecodeError) as error:
        raise RuntimeError(f"Could not read project configuration: {error}") from error

    repositories = {}
    for projects in data.get("projects", {}).values():
        for project in projects:
            for link in project.get("links", []):
                url = link.get("url", "")
                match = re.search(r"github\.com/([^/]+)/([^/?#]+)", url)
                if not match:
                    continue
                owner, repository = match.groups()
                if owner.lower() in PLACEHOLDER_GITHUB_OWNERS:
                    continue
                repository = re.sub(r"\.git$", "", repository)
                repositories[url] = f"{owner}/{repository}"
    return repositories


def fetch_github_stars(config_path):
    print(f"🚀 [GitHub] Reading repo links from {config_path}")
    repositories = repositories_from_config(config_path)
    if not repositories:
        print("ℹ️ [GitHub] No non-placeholder GitHub repositories configured; skipping star fetch.")
        return {}

    print(f"🔎 [GitHub] Found {len(repositories)} repositories.")

    stars_map = {}
    failures = []
    with github_session() as session:
        for full_url, repo_name in sorted(repositories.items()):
            api_url = f"https://api.github.com/repos/{repo_name}"
            try:
                response = session.get(api_url, timeout=10)
                response.raise_for_status()
                stars = response.json().get("stargazers_count")
                if not isinstance(stars, int):
                    raise ValueError("response did not contain an integer stargazers_count")
                stars_map[full_url] = stars
                print(f"   🌟 {repo_name}: {stars}")
            except (requests.RequestException, ValueError) as error:
                failures.append(f"{repo_name}: {error}")
                print(f"   ❌ Error fetching {repo_name}: {error}")

    if failures:
        details = "; ".join(failures)
        raise RuntimeError(
            "GitHub star refresh was incomplete; keeping the previous cache. "
            f"Failures: {details}"
        )
    return stars_map


def main():
    script_dir = Path(__file__).resolve().parent
    config_dir = script_dir.parent / "config"
    data_json_path = config_dir / "data.json"
    config_dir.mkdir(parents=True, exist_ok=True)

    author_id = scholar_id_from_config(data_json_path)
    scholar_data = fetch_scholar_data(author_id)
    if scholar_data:
        write_json_atomic(config_dir / "scholar_data.json", scholar_data)

    try:
        github_data = fetch_github_stars(data_json_path)
    except RuntimeError as error:
        print(f"❌ [GitHub] {error}")
        raise SystemExit(1) from error

    write_json_atomic(config_dir / "github_data.json", github_data)
    print("💾 GitHub Data saved to config/github_data.json")


if __name__ == "__main__":
    main()
