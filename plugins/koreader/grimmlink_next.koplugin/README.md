# GrimmLink Next KOReader Staging client

This KOReader plugin provides two explicit Staging checks:

- A private-LAN Adapter connection using a one-time pairing token held in memory, local test-file listing, and local session START/STOP events.
- One fixed read-only Grimmory request to `http://192.168.1.116:6060/api/v1/opds`. Enter the owner's OPDS user. The username and password are prompted in KOReader and are not saved. The client sends one `GET`, rejects redirects, caps the Atom response at 256 KiB, and displays only the entry count and whether a next page exists. It does not follow feed links or open/download book files.

The local Adapter is expected at `http://192.168.1.116:6062`; its pairing token stays in memory for the current KOReader process. Only the Staging URL and paired device ID are saved in KOReader settings. Automatic sync, Grimmory writes, progress/personal sync, shelf mutation and book downloads remain disabled.

To install, copy the complete `grimmlink_next.koplugin` directory into the KOReader `plugins` directory and restart KOReader. Open **Tools → GrimmLink Next**. To remove it, delete that plugin directory and restart KOReader.

The packaged ZIP is versioned as a Staging test candidate, not a signed production release. CI mocks and a successful catalog request do not prove physical-reader workflows, NAS behavior, full sync or production readiness.
