# FAQs

This page tries to give some answers to recurring questions about this project.

---
Table of Contents

* [What is Pauperformance?](#what-is-pauperformance)
* [What is the Academy?](#what-is-the-academy)
* [What is the Arena?](#what-is-the-arena)
* [What is the Spellbook?](#what-is-the-spellbook)
* [What is the Nexus?](#what-is-the-nexus)
* [Who is Myr?](#who-is-myr)
* [How can I support Pauperformance?](#how-can-i-support-pauperformance)
* [Why are you naming decks this way?](#why-are-you-naming-decks-this-way)
* [What are the next steps?](#what-are-the-next-steps)

---
### What is Pauperformance?

Pauperformance is a shared journey to optimal [Pauper](https://magic.wizards.com/formats/pauper), a [Magic: The Gathering format](https://magic.wizards.com/).

The project consists of distinct yet linked parts: the **Academy** 🎓, the **Arena** ⚔️, the **Spellbook** 🎨, the **Nexus** 🏛, and **Myr** 🤖.

---
### What is the Academy?

The Academy is this website.
It aims to be the online encyclopedia for Pauper, collecting and organising resources for players with different skill levels.

The Academy contains a growing collection of pages, mostly written by the Pauper community.
They provide information about current and old archetypes, sideboard guides, gameplay videos, meta analysis, and more.

To avoid obsolete content, large sections of the website are automatically generated and kept up-to-date by **Myr**, the Pauperformance bot.
This makes it possible for the Academy to easily follow new Magic releases and events, such as weekly online tournaments.

The name is inspired by the card [Tolarian Academy](https://scryfall.com/card/usg/330/tolarian-academy). 🎓

---
### What is the Arena?

The Arena is where we host our shows.

Live videos are streamed [here on Twitch](https://www.twitch.tv/pauperformance); replays are archived [here on YouTube](https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A).

The primary goal of the channel is to have fun together.
As a side effect, we also hope to become better Magic players.

We like to play in an unusual, cooperative way.
It allows us to discuss strategies and share ideas, while making games more engaging for the audience.
Our goal is to systematically explore the format and test different decks to offer a wide coverage of the meta.

We have a lot of fun while playing together, and we hope it's going to be the same for you!

The name is inspired by the card [Phyrexian Arena](https://scryfall.com/card/hop/36/phyrexian-arena). ⚔

---
### What is the Spellbook?

The Spellbook is the artistic spin-off of the project, dedicated to in-depth cards analyses, trivia and Magic lore. 

Pauper artworks and pills are shared [here on Instagram](https://www.instagram.com/pauperformance/).

The primary goal of the Spellbook is to share information about Pauper cards in a lighthearted and engaging way.
We regularly post on the Spellbook also teasers from the Arena.

The name is inspired by the card [Spellbook](https://scryfall.com/card/m10/220/spellbook). 🎨

---
### What is the Nexus?

The Nexus is our Discord server.
It aims to be an inclusive place to chat about decks and strategy of our favorite format, as well as a well-organized content aggregator.

You can join our community [here on Discord](https://discord.gg/2fHG8DTA3R).

The name is inspired by the card [Maelstrom Nexus](https://scryfall.com/card/arb/130/maelstrom-nexus). 🏛

---
### Who is Myr?

Myr is the Pauperformance bot.

It works under the hood to update the Academy and does other magic stuff.
It is hosted on [GitHub](https://github.com/Pauperformance/pauperformance-bot).

The name is inspired by the card [Myr Retriever](https://scryfall.com/card/mrd/215/myr-retriever). 🤖

---
### How can I support Pauperformance?

There are many ways to support the project.

The first and simplest way to support Pauperformance is to follow us/subscribe on [Twitch](https://www.twitch.tv/pauperformance) and [YouTube](https://www.youtube.com/channel/UCDUiIskNnmuJ3XJ1SdQqs0A) and to share this project with other players. This already means a lot to us.

If you are a **Pauper player** and want to help us with the development of the Academy, please join us on [Discord](https://discord.gg/2fHG8DTA3R).
We have a [long roadmap ahead](https://trello.com/b/EtDX4rhf/roadmap) and your support is invaluable.
We cannot and shouldn't try to address every pending task at the same time.
On Discord we will be able to coordinate our efforts.

If you are a **content creator** (e.g. Twitch/YouTube streamer, blogger, etc.) we would be happy to link your content in the Academy and hopefully give more visibility to your work.
Creators that join the Pauperformance network and contribute to the Academy with their work are referred as **PhD** (**Pauper honorable Dignitary**).
If you are interested in getting involved in the project, please read the [PhD Guidelines](phd_guidelines.html).

If you are a **software developer** with a basic knowledge of Python, JavaScript, HTML, Markdown, git, and Jekyll, please [contact us](contact.html).
We haven't set up any contribution guidelines for our codebase yet, but you may still help us with some tasks in the [roadmap](https://trello.com/b/EtDX4rhf/roadmap).
We also suspect that if you have a basic knowledge of Python, JavaScript, HTML, Markdown, git, and Jekyll you will probably be already busy with your cool personal projects.
Good luck with them!

If you are a **Reddit admin of [r/pauper](https://www.reddit.com/r/Pauper/)**, please [contact us](contact.html).
We would like to further involve the Reddit community in the project.

Huge thanks for your help!

---
### Why are you naming decks this way?

Pauperformance naming convention for decks lies at the core of the project.

Every deck in Pauperformance is uniquely identified by the combination of: `archetype_name`/`magic_set_id`/`revision_id`/`player_id`.

The complete naming scheme is `Archetype_name magic_set_id.revision_id.player_id`.
Space and dots are relevant.

For example, if the player *MrEvilEye* creates a new *Affinity* deck with the cards available after the release of *Modern Horizons 2 (mh2)*, the deck will be named `Affinity 676.001.MrEvilEye`.
In this example, `676` is the Pauperformance code associated to mh2 (ref: [Set Index](set_index.html)), while `001` means it's the first list for the deck. 
Later on, if the player *MrEvilEye* makes a change to the decklist, the new deck will be named `Affinity 676.002.MrEvilEye`. And so on.

The peculiar naming scheme (`Archetype magic_set_id.revision_id.player_id`) makes it possible for Myr to index Pauper content on Internet and automatically link new online resources to the correct archetypes.
Additionally, several analyses can be also automatically performed, providing insights on the format that cannot be typically found on other popular websites dedicated to Magic.

This naming scheme will allow Pauperformance to get a deep understanding of the format.
Please, be patient and trust us.

---
### What are the next steps?

We have [tons of things to do](https://trello.com/b/EtDX4rhf/roadmap) and it's going to take a while.
We are sure it's going to be worth it: please, be patient.

Our plan is to include other people in the project.
We are specifically looking for content creators (streamers, article writers, expert players, etc.), because we wish the Academy could bring more visibility to their awesome work.
If you are a creator, there are chances you will be contacted by us in the upcoming weeks/months.
Feel free to immediately contact us if you want to know more about the project.

We plan to share updates on the status of the project on a bi-weekly basis.
Follow us for regular updates.
The journey is long and exciting!
