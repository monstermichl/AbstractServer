#!/bin/bash

# Constants
README_TEMPLATE_PATH="README-template.md"
README_PATH="README.md"
LOAD_REGEX="<load:(.+)>"
IGNORE_REGEX_START="<ignore-in-readme>"
IGNORE_REGEX_END="<dont-ignore-in-readme>"

function write_to_readme {
    echo "$1" >> "${README_PATH}"
}

# Create README.md.
echo -n "" > "${README_PATH}"

# Generate README.md content.
while read line; do
    line_content="${line}"
    ignore=0

    if [[ "${line}" =~ ${LOAD_REGEX} ]]; then
        nothing_written=1

        while IFS= read code; do
            # Enable ignore.
            if [[ "${code}" =~ ${IGNORE_REGEX_START} ]]; then
                ignore=1
            fi

            # Write code line if not ignored and if it's not a blank line before any code.
            if [ $ignore -eq 0 ] && ([ $nothing_written -eq 0 ] || ([ $nothing_written -eq 1 ] && [ "${code}" != "" ])); then
                write_to_readme "${code}"
                nothing_written=0
            fi

            # Disable ignore.
            if [[ "${code}" =~ ${IGNORE_REGEX_END} ]]; then
                ignore=0
            fi
        done < "${BASH_REMATCH[1]}"
    else
        write_to_readme "${line_content}"
    fi
done < "${README_TEMPLATE_PATH}";
