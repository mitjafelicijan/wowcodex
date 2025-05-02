# Vanilla WoW Database exporter

## Installation and usage 

```sh
# This will extract SQL file from archive
# and then run Docker Composer stack
# setting up MySQL database.
make stack

# Sets up Python environment.
python3 -m venv .venv
source .venv/bin/activate
pip install mysql-connector-python

# Exports spell list to Lua compatible file.
python spell-name-by-id.lua
```

> [!NOTE]
> Check `out` directory for already export files.

## Exporters

- `SpellNameByID` (Exports all the spells in the database with ID, Name attribute).

## Resources

- https://github.com/brotalnia/database
