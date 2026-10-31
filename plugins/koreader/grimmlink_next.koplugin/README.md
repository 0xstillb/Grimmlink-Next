# GrimmLink Next KOReader offline preview

This is an installable KOReader menu preview. Its broad menu structure follows
the Connection, sync actions, advanced setup/backup, shelf settings, and
diagnostics groups used by GrimmLink. Those entries are previews only: this
plugin does not connect to Grimmory, send requests, save credentials, sync
reader data, or write to device books. Every sync/configuration action explains
that the feature is disabled.

To install, copy the complete `grimmlink_next.koplugin` directory into the
KOReader `plugins` directory and restart KOReader. Open **Tools → GrimmLink
Next**. To remove it, delete that plugin directory and restart KOReader.

The package is a UI preview only; it is not a release of the GrimmLink sync
client and has not been tested on a physical reader.
