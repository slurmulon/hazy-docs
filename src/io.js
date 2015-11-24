'use strict'

import {Blueprint} from './apib'
import * as env from './env'

import hazy from 'hazy'
import protagonist from 'protagonist'
import hercule from 'hercule'

import _ from 'lodash'
import _glob from 'glob'
import fs from 'fs'
import path from 'path'

import {logger} from './log'

/**
 * Parses and compiles an API blueprint from the file system
 *
 * @param {String} filepath
 * @returns {Promise}
 */
export function src(filepath: String): Promise {
  log().info(`importing content from ${filepath}`)

  return new Promise((resolve, reject) => {
    if (filepath) {
      util.fs.src(filepath).then(resolve)
    } else {
      reject(`Failed to read file, filepath required`)
    }  
  })
}

/**
 * Reads in and then exports API blueprints as either a static html or apib file
 * to the provided file path
 *
 * @param {String} markdown
 * @param {String} filepath
 * @returns {Promise}
 */
export function dist(markdown, filepath: String): Promise {
  log().info(`exporting content to ${filepath}`)

  return new Promise((resolve, reject) => {
    const extension = filepath.match(/\.([0-9a-z]+)$/i)

    if (extension) {
      read(markdown)
        .then(consumed => Blueprint.marshall(consumed.compiled.markdown, extension[1]))
        .then(marshalled => util.fs.dist(filepath, marshalled))
        .then(resolve)
        .catch(reject)
    } else {
      reject(`File destinations must contain an extension (.apib or .html)`)
    }
  })
}

/**
 * Globs and reads in valid API blueprint(s) from the filesystem and compiles them
 *
 * @param {Array|String} blueprints
 * @returns {Promise}
 */
export function glob(pattern, options): Promise {
  log().info(`globbing against ${pattern}`)

  return new Promise((resolve, reject) => {
    _glob(pattern, options, (err, files) => {
      if (!err) {
        Promise
          .all(
            files.map(filepath => src(filepath))
          )
          .then(resolve)
          .catch(reject)
      } else {
        reject(`failed to load globbed file: ${err}`)
      }
    })
  })
}

/**
 * Reads in valid API blueprint(s) from Strings or 
 * Arrays of Strings and compiles them
 *
 * @param {Array|String} blueprints
 * @returns {Promise}
 */ 
export function read(blueprints): Promise {
  log().info('reading in content')

  return new Promise((resolve, reject) => {
    if (_.isArray(blueprints)) {
      Promise
        .all(
          blueprints.map(bp => new Blueprint(bp).compile())
        )
        .then(resolve)
        .catch(reject)
    } else if (_.isString(blueprints)) {
      resolve(new Blueprint(blueprints).compile())
    } else {
      reject('Documents must be represented as a String or Array, got ' + typeof blueprints)
    }
  })
}

export const util = {
  fs: {
    src: (filepath) => {
      return new Promise((resolve, reject) => {
        const relPath = env.current().uri(filepath)

        fs.readFile(relPath, 'utf-8', (err, data) => {
          if (!err) {
            log().info(`imported contents of ${filepath}`)

            new Blueprint(data)
              .compile()
              .then(resolve)
              .catch(reject)
          } else {
            reject(`Failed to read file: ${err}`)
          }
        })
      })
    },

    dist: (filepath, markdown) => {
      return new Promise((resolve, reject) => {
        const relPath = env.current().uri(filepath)

        fs.writeFile(relPath, markdown, 'utf-8', (err) => {
          if (!err) {
            log().info(`exported content to ${filepath}`)

            resolve(markdown)
          } else {
            reject(`An error occured while saving file: ${err}`)
          }
        })
      })
    }
  }

  // TODO uri
}

export const log = () => logger().child({module: 'io'})
