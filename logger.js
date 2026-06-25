const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  SILENT: 4,
}

function createLogger(options = {}) {
  const level = LOG_LEVELS[options.level] ?? LOG_LEVELS.INFO
  const writer = options.writer ?? process.stdout
  const errorWriter = options.errorWriter ?? process.stderr

  function formatMessage(tag, message) {
    const timestamp = new Date().toISOString()
    return `${timestamp} [${tag}] ${message}\n`
  }

  function write(targetLevel, tag, message) {
    if (level > targetLevel) return
    const formatted = formatMessage(tag, message)
    if (targetLevel >= LOG_LEVELS.ERROR) {
      errorWriter.write(formatted)
    } else {
      writer.write(formatted)
    }
  }

  return {
    debug(tag, message) {
      write(LOG_LEVELS.DEBUG, tag, message)
    },
    info(tag, message) {
      write(LOG_LEVELS.INFO, tag, message)
    },
    warn(tag, message) {
      write(LOG_LEVELS.WARN, tag, message)
    },
    error(tag, message) {
      write(LOG_LEVELS.ERROR, tag, message)
    },
  }
}

module.exports = { createLogger, LOG_LEVELS }
