# Load the unpacked extension into Brave for manual testing.
# Brave uses a separate profile in .brave-profile, so your real Brave profile is untouched.

brave_bin := env("BRAVE_BIN", if os() == "macos" { "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser" } else { "brave" })
profile := justfile_directory() + "/.brave-profile"

default:
    @just --list

# Restart Brave with the extension loaded from this checkout and open RFD Hot Deals.
# Re-run after editing source files; the extension is re-read on each launch.
brave url="https://forums.redflagdeals.com/hot-deals-f9/":
    -pkill -f "user-data-dir={{profile}}"
    sleep 1
    "{{brave_bin}}" --user-data-dir="{{profile}}" --no-first-run --no-default-browser-check \
        --load-extension="{{justfile_directory()}}" --disable-extensions-except="{{justfile_directory()}}" \
        "{{url}}" >/dev/null 2>&1 &

# Run the unit test suite.
test:
    npm test
