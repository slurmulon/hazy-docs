'use strict'

import {Blueprint} from './apib'

import hazy from 'hazy'
import protagonist from 'protagonist'
import hercule from 'hercule'

import _ from 'lodash'
import _glob from 'glob'
import fs from 'fs'
import path from 'path'

import {logger} from './log'

export function enviro() {

}

export function scaffold() {
  
}

export function watch() {
  // WARN - non-recursive
  
  // fs.watch(path, (event, filename))
}

export function validate() {

}

export function test() {

}

export const log = logger.child({module: 'workflow'})
