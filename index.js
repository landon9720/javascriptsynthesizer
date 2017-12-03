import _ from 'lodash'
import { context, F, play } from './context'
import Monad from './Monad'
import scriptNodeFactory from './scriptNodeFactory'
import {sin, sum, seq, loop, gain, organ, shave, trim} from './monads'

const fs = _.range(80, 2000, 30)
const tune = loop(seq(..._.map(fs, f => organ(f, 1))))
play(tune)
