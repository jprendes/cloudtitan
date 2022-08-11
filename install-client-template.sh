#!/usr/bin/bash

{ # this ensures the entire script is downloaded #

# PAYLOAD

cloudtitan_has() {
  type "$1" > /dev/null 2>&1
}

cloudtitan_echo() {
  command printf %s\\n "$*" 2>/dev/null
}

cloudtitan_error() {
  command printf >&2 "\\e[31;1m%s\\e[0m\\n" "$*" 2>/dev/null
  exit 1
}

cloudtitan_info() {
  command printf >&2 "\\e[33;1m%s\\e[0m\\n" "$*" 2>/dev/null
}

cloudtitan_needs() {
  if ! cloudtitan_has "$1"; then
    cloudtitan_error "Error: Can't find '$1'"
  fi
}

if [ -z "${BASH_VERSION}" ] || [ -n "${ZSH_VERSION}" ]; then
  cloudtitan_error "Error: Please pipe the install script to 'bash'"
fi

cloudtitan_try_profile() {
  if [ -z "${1-}" ] || [ ! -f "${1}" ]; then
    return 1
  fi
  cloudtitan_echo "${1}"
}

#
# Detect profile file if not specified as environment variable
# (eg: PROFILE=~/.myprofile)
# The echo'ed path is guaranteed to be an existing file
# Otherwise, an empty string is returned
#
cloudtitan_detect_profile() {
  if [ "${PROFILE-}" = '/dev/null' ]; then
    # the user has specifically requested NOT to have cloudtitan touch their profile
    return
  fi

  if [ -n "${PROFILE}" ] && [ -f "${PROFILE}" ]; then
    cloudtitan_echo "${PROFILE}"
    return
  fi

  local DETECTED_PROFILE
  DETECTED_PROFILE=''

  if [ "${SHELL#*bash}" != "$SHELL" ]; then
    if [ -f "$HOME/.bashrc" ]; then
      DETECTED_PROFILE="$HOME/.bashrc"
    elif [ -f "$HOME/.bash_profile" ]; then
      DETECTED_PROFILE="$HOME/.bash_profile"
    fi
  elif [ "${SHELL#*zsh}" != "$SHELL" ]; then
    if [ -f "$HOME/.zshrc" ]; then
      DETECTED_PROFILE="$HOME/.zshrc"
    fi
  fi

  if [ -z "$DETECTED_PROFILE" ]; then
    for EACH_PROFILE in ".profile" ".bashrc" ".bash_profile" ".zshrc"
    do
      if DETECTED_PROFILE="$(cloudtitan_try_profile "${HOME}/${EACH_PROFILE}")"; then
        break
      fi
    done
  fi

  if [ -n "$DETECTED_PROFILE" ]; then
    cloudtitan_echo "$DETECTED_PROFILE"
  fi
}

do_install() {
  cloudtitan_needs mkdir
  cloudtitan_needs mv
  cloudtitan_needs gunzip
  cloudtitan_needs chmod

  local CLOUDTITAN_PROFILE
  local DEST

  CLOUDTITAN_PROFILE="$(cloudtitan_detect_profile)"
  DEST="${HOME}/.local/cloudtitan/cloudtitan"

  mkdir -p $(dirname "${DEST}")
  mv "${PAYLOAD}" "${DEST}".gz
  gunzip -f "${DEST}".gz
  chmod a+x "${DEST}"

  SOURCE_STR="\\nexport PATH=\"${HOME}/.local/cloudtitan/:\${PATH}\"  # This loads cloudtitan\\n"

  if [ -z "${CLOUDTITAN_PROFILE-}" ] ; then
    local TRIED_PROFILE
    if [ -n "${PROFILE}" ]; then
      TRIED_PROFILE="${CLOUDTITAN_PROFILE} (as defined in \$PROFILE), "
    fi
    cloudtitan_info "=> Profile not found. Tried ${TRIED_PROFILE-}~/.bashrc, ~/.bash_profile, ~/.zshrc, and ~/.profile."
    cloudtitan_info "=> Create one of them and run this script again"
    cloudtitan_info "   OR"
    cloudtitan_info "=> Append the following lines to the correct file yourself:"
    command printf "${SOURCE_STR}"
    cloudtitan_info
  else
    if ! command grep -qc '/cloudtitan' "$CLOUDTITAN_PROFILE"; then
      cloudtitan_info "=> Appending cloudtitan source string to $CLOUDTITAN_PROFILE"
      command printf "${SOURCE_STR}" >> "$CLOUDTITAN_PROFILE"
    else
      cloudtitan_info "=> cloudtitan source string already in ${CLOUDTITAN_PROFILE}"
    fi
  fi
}

do_install
exit 0

} # this ensures the entire script is downloaded #
