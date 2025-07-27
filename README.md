<div align="center">
  <img src=".github/meta/logo.svg" style="width: 100px; border-radius: 50%" />

  <h4>Conversations that never happened.<h4>

![Proof of Concept](https://img.shields.io/badge/Proof_of_Concept-black)
![CI Status](https://img.shields.io/github/actions/workflow/status/revery-project/revery/ci.yml?label=CI)
![GitHub Release](https://img.shields.io/github/v/release/revery-project/revery)

</div>

Revery is for when you need to talk, but can't afford for anyone to prove you did. Think old spy movies - secure conversations that leave no trace, no evidence, no "smoking gun" in a device seizure.

![Screenshot](.github/meta/screenshot.png)

---

## How it works

### No identity, no history

- No contacts, no accounts, no persistent anything
- Each conversation starts from scratch
- When it ends, it's like it never existed

### Perfect deniability

- Share a secret phrase in person
- Later, connect over temporary Tor hidden services
- Same encryption key can create "alternative facts" - impossible to prove which conversation really happened

### Built for paranoia

- Messages encrypted with ChaCha20
- Authentication via SPAKE2 (no secret revealed)
- Everything disappears when you close the app

---

## Try it out

```bash
just run dev
```

- Enter your passphrase and click **Host** to create a session
- Share the generated onion address with your contact
- They enter the address and passphrase to join

Share the onion address however you want - Signal, email, carrier pigeon. Without the secret phrase, it's useless.

---

**EXPERIMENTAL SOFTWARE**: This has not undergone professional security audit. Suitable for research and testing only. Do not use for high-stakes communications.

---

_"The best conversations happen in rooms with no windows, no doors, and no memory."_

**License:** Apache 2.0 or MIT
