import requests
from bs4 import BeautifulSoup
import json
import os
import re
import time

# 你的 Scholar ID
AUTHOR_ID = 'Thyo5v4AAAAJ' 

# ----------------- 1. Scholar 抓取函数 -----------------
def fetch_scholar_data():
    print(f"🚀 [Scholar] Starting fetch for ID: {AUTHOR_ID}")
    url = f"https://scholar.google.com/citations?user={AUTHOR_ID}&hl=en"
    headers = {"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"}

    try:
        response = requests.get(url, headers=headers, timeout=10)
        if response.status_code != 200: return None
        soup = BeautifulSoup(response.text, "html.parser")
        stats = soup.find_all("td", class_="gsc_rsb_std")
        if stats:
            print(f"✅ [Scholar] Success! Citations: {stats[0].text}")
            return {"citedby": stats[0].text, "h_index": stats[1].text}
    except Exception as e:
        print(f"❌ [Scholar] Error: {e}")
    return None

# ----------------- 2. GitHub Star 抓取函数 -----------------
def fetch_github_stars(config_path):
    print(f"🚀 [GitHub] Reading repo links from {config_path}")
    
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
    except Exception as e:
        print(f"❌ [GitHub] Could not read config file: {e}")
        return {}

    stars_map = {}
    repos_to_fetch = set()

    if 'projects' in data:
        for category in data['projects']:
            for project in data['projects'][category]:
                if 'links' in project:
                    for link in project['links']:
                        url = link.get('url', '')
                        match = re.search(r'github\.com/([^/]+)/([^/]+)', url)
                        if match:
                            repo_api = f"{match.group(1)}/{match.group(2)}"
                            repo_api = repo_api.replace(".git", "").rstrip("/")
                            repos_to_fetch.add((url, repo_api))

    print(f"🔎 [GitHub] Found {len(repos_to_fetch)} repositories.")

    for full_url, repo_name in repos_to_fetch:
        api_url = f"https://api.github.com/repos/{repo_name}"
        try:
            resp = requests.get(api_url, timeout=5)
            if resp.status_code == 200:
                info = resp.json()
                stars = info.get('stargazers_count', 0)
                stars_map[full_url] = stars
                print(f"   🌟 {repo_name}: {stars}")
            else:
                print(f"   ⚠️ Failed {repo_name}: {resp.status_code}")
            
            time.sleep(0.5) 
        except Exception as e:
            print(f"   ❌ Error fetching {repo_name}: {e}")

    return stars_map

if __name__ == "__main__":
    script_dir = os.path.dirname(os.path.abspath(__file__))
    config_dir = os.path.join(script_dir, '..', 'config')
    data_json_path = os.path.join(config_dir, 'data.json')
    
    os.makedirs(config_dir, exist_ok=True)
    scholar_data = fetch_scholar_data()
    if scholar_data:
        with open(os.path.join(config_dir, 'scholar_data.json'), 'w') as f:
            json.dump(scholar_data, f, indent=2)
            
    github_data = fetch_github_stars(data_json_path)
    if github_data:
        with open(os.path.join(config_dir, 'github_data.json'), 'w') as f:
            json.dump(github_data, f, indent=2)
        print(f"💾 GitHub Data saved to config/github_data.json")