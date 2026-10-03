---
title: "AI, Secrets, and What Not To Do"
pubDate: 2026-10-02T12:00:00-04:00
tags: ["homelab", "ai", "security", "talos", "kubernetes"]
categories: ["Homelab", "AI", "Security"]
draft: false
---

For six days, anyone on the internet could have taken over my home Kubernetes cluster. The cluster CA, admin client cert, Talos join tokens, etcd keys - the full map of every machine behind my router. All of it, readable by anyone who found the right URL and wanted some free compute.

It lived in a commit titled **`fix: change model name`**.

It's been a _long_ time since I last wrote a blog post here, but I'm glad I am now. This is about what happened, what could have happened, and (the part you should read, even if you don't run a cluster) what I've built since.

It's 2026. It's not a question of if - it *will* happen again. I sure hope this hasn't happened to you already, but if it does I hope this offers a modicum of protection.

-----

## Homelab Setup

My homelab is a nine-node Talos Linux Kubernetes cluster behind a UniFi stack, running a self-hosted LLM stack.

```yaml
cluster:
  os: "Talos Linux"
  nodes: 9
ai_stack:
  router: "LiteLLM Router" # https://github.com/home-operations/litellm-operator
  backends:
    - name: "quantumleap"
      gpu: "RTX 5090 (32GB)"
      model: "Qwen3.8-27B-NVFP4 on vLLM"
    - name: "intellectual"
      gpu: "Intel ARC B70 Pro (32GB)"
      model: "google/gemma-4-12B-it on vLLM"
    - name: "mac-mini"
      chip: "M4 Pro, 48GB"
      model: "GPT-OSS 20B on llama.cpp"
```

The cluster is managed by my [HELO](https://github.com/GoodMannersHosting/home-enterprise-labops) repo, which is **public on GitHub by design**. It's an educational repo as well as my homelab, and my original tagline is/was "Test Big Ideas in Small Spaces". It's nowhere near the stars I had on my original homelab repo, but it's written to be a reference for anyone looking to set up either a similar cluster or straight rip shit out of it for work purposes.

> [!NOTE]
> I've spoken to LOTS of people over the past few years about how getting into DevOps/Platform Engineering is harder and harder while the knowledge and learning materials have simultaneously matured and become plentiful over time. I believe that the barrier to entry has only gotten higher, and I hope that my work can help to lower it for the engineers who will inevitably surpass me.

A friend and I were working to get LiteLLM up and running for my homelab, as they use my models as well (self-hosted AI, baybeeeee), and both of our agents running locally were committing under our own git identities. I'm not going to name him, because honestly whose agent it was is completely irrelevant. It had push access to a public repo, and none of the safeties that should have existed were there: no pre-commit secrets scanning, no branch protection, nothing between `git commit` and the internet.

On **September 20th, 2026**, as part of my upgrade and cutting over from `talhelper` to `topf` and upgrading to Kubernetes 1.37, I deprecated `talosctl` and switched cluster management to [**TOPF** (Talos Orchestrator by PostFinance)](https://github.com/postfinance/topf). TOPF is a declarative orchestrator, and one of the things it does is render the full cluster configuration — machine configs for all nine nodes — into the repo's working tree under `infrastructure/clusterconfig/`. While my friend was helping me debug things in my cluster, they rendered out the `kubeconfig`, Cluster Config, and Node Config files locally (which, valid). The AI agent then - in its _infinite wisdom_ - decided to commit everything, including the admin `kubeconfig` and machine configs for all nine nodes. For the next several days, my shit was just _public_ in the repo in a commit.

The only "luck" was that the agent had noticed its mistake and cleaned it up before the next commit, so...at least it wasn't "front and center," or something.

-----

## What Happened?

At **6:13 PM EDT on 2026-09-20**, the agent pushed a commit titled **"fix: change model name"** straight to `main` of the public repo. The actual change was a few lines: rename `intel-llama` to `bonsai-llama` in the Llama Router config, and add `teamID: scum` to a `team.yaml`. Perfectly innocent model-name fix.

The problem was *how* it committed. The agent committed everything in the working tree (`git add -A` situation), so the commit swept in everything that was sitting in the repo at that time.

- An **admin kubeconfig** - cluster CA, admin client cert, and client private key
- A Talos **`talosconfig`** - `os:admin` client cert and private key, plus endpoints for every node
- **machine configs for all nine nodes**

The worker configs contained join tokens, the Cluster ID secrets, CAs, and functionally a map of my LAN and internal IPs. The three control-plane machine configs went further and contained the **cluster CA private key**, the **aggregator CA key**, the **service-account RSA signing key**, the **etcd CA key**, the **SecretBox encryption secret**, a **second join token**, and the **OIDC config** for the GMH identity realm.

The bigger issue aside from someone being able to join new nodes to my cluster was the `kubeconfig`. If someone did find it (and I have to assume someone or something did), they would have had full cluster admin. They could exfiltrate all of my secrets for external services, they could utilize my AI hosted in my house, they'd be able to do a fair amount of damage and compromise a lot of shit, both inside and outside my homelab.

_Cool._

I had built a setup where it was possible for the most valuable set of files could exist in the working tree of a public repository, and my only protection was the assumption that `.gitignore` would work and that `<checks notes>` **nobody would read a homelab repo**. The agent's commit messages that week are a nice record of the era. Titles like "wrong paralellization", "utilitzation", and "Accidentally deleted API key" - a week of small typos, and the innocuous one:

```text
fix: change model name
```

-----

## What Was Exposed

Here's the redacted list of what the commit contained, which is what I'd show a friend if this happened to them:

```yaml
kubeconfig:
  cluster_ca: "[REDACTED]"
  admin_client_cert: "[REDACTED]"
  admin_client_key: "[REDACTED]"
talosconfig:
  os_admin_client_cert: "[REDACTED]"
  os_admin_client_key: "[REDACTED]"
  node_endpoints: "[all nine, REDACTED]"
machine_configs:
  all_nine:
    join_token: "[REDACTED]"
    cluster_id: "[REDACTED]"
    cluster_secret: "[REDACTED]"
    internal_ips: "[REDACTED]"
    mac_addresses: "[REDACTED]"
    disk_wwids: "[REDACTED]"
  control_plane_only:   # cachecow, rampage, segfault
    cluster_ca_key: "[REDACTED]"
    aggregator_ca_key: "[REDACTED]"
    service_account_signing_key: "[REDACTED]"
    etcd_ca_key: "[REDACTED]"
    secretbox_encryption_secret: "[REDACTED]"
    second_join_token: "[REDACTED]"
    keycloak_oidc_config: "[REDACTED]"
kubernetes_secrets:
  - HuggingFace API token
  - LiteLLM Router keys
  - AWS S3 Credentials
  - My Postgres Root DB Creds
  - GitHub App (Full Admin Org Creds)
```

And yes - the API server was on the public internet. By design. It sat behind a public DNS name and my UniFi stack, reachable from anywhere, _by design_. Which is exactly why the six-day window makes me cringe as much as it does.

I found it in about the dumbest possible way, too: more AI agents. I was testing out [Zed](https://zed.dev/) and subagent capabilities, and as part of that I asked it to run a full security scan of the homelab repo. At around 1:15 AM on a Friday night/Saturday morning when I'm getting ready to go to bed, it finished it's scan. It politely told me "Hey, things are generally pretty good! Except for this critical thing you should tackle right now: there are leaked cluster config sitting on `main` branch. Within about five minutes, I verified it the leak, cursed loudly several time, and pulled public access to the Kubernetes control plane.

The irony is not lost on me. In a blog post about how an AI agent leaked my shit, the thing that caught the leak was another AI agent.

The exposure window was roughly six days: the push at 6:13 PM on the 20th, through the rotation on the morning of the 26th.

The same weekend, I found a second leak. In my other public repo (`cloud-security-cluster`, my OpenBao infrastructure), the agent had written a GitHub Actions workflow, `bao-sync.yml`, with debug `echo` statements that printed the GitHub OIDC token, the JWT login response, and the full `BAO_TOKEN` into the public Actions logs. This one was secrets in public logs, which is arguably dumber. Hard to call it better or worse, but stupid nonetheless.

```text
chore: don't do stupid shit and expose tokens     # 14:48
fix(ci): install bao CLI and stop leaking tokens  # 14:58
```

The second one adds `::add-mask::` masking for the token and removes the echoes. The first one is just what I call it.

-----

## Un-Fucking the Damage and Remediation

Like I said above, within a few minutes of verification of exactly what had happened, I pulled public access to the K8s control plane. The second move was to nuke the commits to `main` branch. From some previous experience I used [`newren/git-filter-repo`](https://github.com/newren/git-filter-repo) to clean it. From my `zsh` history, here are the commands I ran.

```bash
# Install git-filter-repo
uv tool install git-filter-repo

# Clone my homelab repo to a new location, no local history
cd /tmp

git clone \
git@github.com:GoodMannersHosting/home-enterprise-labops.git \
labops-scrub

cd labops-scrub

# Scrub sensitive data from the repo
git filter-repo --invert-paths \
--path kubeconfig \
--path infrastructure/clusterconfig \
--path infrastructure/archived-talhelper \
--path infrastructure/talsecret.yaml \
--path infrastructure/topf/clusterconfig/talosconfig

# Push the scrubbed repo to the upstream remote,
# force-pushing to overwrite the old one
git remote add origin \
git@github.com:GoodMannersHosting/home-enterprise-labops.git
git push --force --all origin
git push --force --tags origin

# Switch back to my original repo
cd ~/code/home-enterprise-labops

# Reset my local `main` branch to match the
# upstream `main` branch, post-scrub.
git switch main
git reset --hard origin/main
```

It should go without saying, but the longer I'm in the industry the more I think I _need_ to be explicit: **deletion is not remediation**. GitHub is [well known to serve deleted commits by SHA, and even after a force-push, the commit object is still retrievable](https://trufflesecurity.com/blog/anyone-can-access-deleted-and-private-repo-data-github). If you think you've solved your problem by re-writing history and force pushing, you're dead wrong. The immediate next step is to rotate **EVERY SECRET OF POTENTIAL VALUE OR INTEREST TO A BAD ACTOR**. It's 2026 - you should assume that someone or something will find your credentials and give them a try. 

The primary fix landed at **2:36 AM EDT on 2026-09-26**, in a commit I titled, with the full 3 AM energy, **"!!CRITICAL BREAKING CHANGES!! - ROTATED CLUSTER CA AND KEYS"**.

That commit primarily re-encrypted the entire TOPF secrets file as well as generating a new Cluster ID and secret, new bootstrap token, new SecretBox encryption secret, new `trustd` token, as well as etcd, k8s, k8s-aggregator, and k8s-service-account certs and keys. A full CA and key rotation unfortunately being necessary here to make sure someone couldn't access my cluster later on.

After getting a few hours of sleep and waking up to a terrifying alert from AWS about unusual billing activity (which turned out to be nothing, thank god), I was able to get back to rotating potentially compromised secrets.

While I did review cluster logs and if there had been anything added/modified over the roughly six-day window, I started rotating configs for each of my Kubernetes nodes. "Trust, but Verify" **must** be your default behavior when you're dealing with something like this. I rotated every secret of potential value in the cluster, and double/triple checked that I hadn't missed something in the early hours of the morning.

The OpenBao stuff was easier: the tokens had already expired and we had already tuned how long JWT tokens were valid for (~10m), so the blast radius was minimal - relatively speaking. We adjusted the GitHub Action workflow and corrected the secret leakage.

-----

## What Should Be Done To Keep It From Happening

Let's start with the obvious:

**You WILL fuck up. Your agent WILL fuck up. Something will get leaked you do not want leaked. Design for the inevitable.**

### Pre-Commit Hooks

There are a couple different ways to do things when it comes to Pre-Commit hooks. I'm preferential to [`pre-commit`](https://github.com/pre-commit/pre-commit), but there's also [`lefthook`](https://github.com/evilmartians/lefthook). Either way, make sure you have a hook which runs one of the following tools (or multiple, tbqh):

- [Talisman](https://github.com/thoughtworks/talisman)
- [GitLeaks](https://github.com/gitleaks/gitleaks)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)

Brian Douglas had a good blog post last year titled ["Pre-commit hooks are back thanks to AI"](https://briandouglas.me/posts/2025/08/27/pre-commit-hooks-are-back-thanks-to-ai/), mostly around formatting/linting, and it's a good quick read. I'd like to expand on that and implore that we as individual contributors focus and improve our best practices for the sake of safety and security.

Also - and not always possible - but a credential that expires in ~10-15 minutes is safer than a credential that never expires. It might not be _safe_, but when you (or your agent) fuck up and accidentally commit something, at least the blast radius is hopefully limited.

Well, so long as it's not a repeated fuck up.

### Agent Skills

My previous employer (Cisco) originally created [Codeguard](https://github.com/cosai-oasis/project-codeguard), now Project Codeguard.

TL;DR, and from their GitHub Page:

> [Project CodeGuard](https://project-codeguard.org/) is an AI model-agnostic security coding agent skills framework and ruleset that embeds secure-by-default practices into AI coding workflows (generation and review). It ships core security skills and rules, translators for popular coding agents, and validators to test skills and rule compliance.

Utilizing skills which enhance and improve your agents awareness to pushing code and files it very should not commit is a good thing. If you're not using skills like this today, you should be.

-----

## We're well into the Age Of AI

Agents write more code, faster, and commit with different (not less) judgment than the humans supervising them. That's not an insult to the agents, it's a numbers game. Good Humans are (hopefully) going to make a bad `git add` once or twice a year. An agent that holds - say, your whole cluster config in its working tree - can do it in the middle of a refactor that is otherwise going fine. The blast radius of one bad `git add` used to be "oops, that's not good and I should fix it" and now is closer to "wait shit it's been up for six days because I wasn't watching my Agent??"

The risks and fuck-ups around local/developer security are so much more tangible in the age of AI. It's easier than ever to commit unwanted code and publish to GitHub, and it's more difficult than ever to find your fuck-ups after the fact. _Yes_, there are tools like [GitGuardian](https://www.gitguardian.com/) (which I do highly recommend, they're awesome), but they're not the only thing you need. Amusingly, we did get an email 

-----

## Final Thoughts

This was a shockingly stupid screw up on our part, but I'm almost glad it happened. The actual blast radius ended up being non-existent, and we were able to quickly and easily fix it once we identified what happened. The agent had also quickly re-committed and removed the `kubeconfig` and other files from the working tree, so that's...good? Basically I haven't found any indicators where anyone actually _did_ anything malicious, but it's terrifying to think a bad actor, script kiddie, or random Agent could have.

-----

Ultimately, I ask myself if this would have happened if we weren't using AI.

_No, probably not._

-----

## References In This Post

### GitHub Repositories

- [Home Enterprise LabOps Repo](https://github.com/GoodMannersHosting/home-enterprise-labops)
- [Talos Orchestrator by PostFinance](https://github.com/postfinance/topf)
- [`newren/git-filter-repo`](https://github.com/newren/git-filter-repo)

### Pre-Commit Hook Tooling

- [`pre-commit`](https://github.com/pre-commit/pre-commit)
- [`lefthook`](https://github.com/evilmartians/lefthook)

### Secrets Scanning 

- [Talisman](https://github.com/thoughtworks/talisman)
- [GitLeaks](https://github.com/gitleaks/gitleaks)
- [TruffleHog](https://github.com/trufflesecurity/trufflehog)

### AI Agent Security Skills

- [Codeguard](https://github.com/cosai-oasis/project-codeguard)

### Software

- [Zed](https://zed.dev/)
- [GitGuardian](https://www.gitguardian.com/)

### External Blog Posts
- [Truffle Security | Anyone can access deleted and private repo data on GitHub](https://trufflesecurity.com/blog/anyone-can-access-deleted-and-private-repo-data-github)
- ["Pre-commit hooks are back thanks to AI"](https://briandouglas.me/posts/2025/08/27/pre-commit-hooks-are-back-thanks-to-ai/)

-----

> [!NOTE]
> Thank you for the review before posting, [@coolguy1771](https://github.com/coolguy1771).

Feel free to add or message me on [LinkedIn](https://www.linkedin.com/in/danielmanners/). If something I wrote isn't clear, feel free to ask me a question or tell me to update it!
