import Rete from 'rete'
import { publishWorkflowMessage } from './../workflow'
import { normalizeArgs, generateErrorMessage, parseExpression } from '../../utils'


class LayoutMixinComponent extends Rete.Component {
  constructor() {
    super('LayoutMixin')
  }

  worker(node, inputs, outputs) {
    const inputData = inputs['input'][0]
    const outputObj = inputData
    const data = node.data
    const { api, args, argDefinitions } = data

    let operateOn = inputData.input.operateOn
    let env = inputData.input.env
    let operator = data['operator']
    let isFunction = false

    if (operateOn) {
      if (api == 'figma') {
        if (operator) {
          isFunction = (typeof operateOn[operator] === 'function')
        }

        const normalizedArgs = normalizeArgs(args, argDefinitions, isFunction)

        if (isFunction) {
          let normalizedValues = []

          for (const [i, value] of normalizedArgs.entries()) {
            parseExpression(operateOn, env, value).then(ret => {
              if (ret !== null) {
                normalizedValues.push(ret)
              }
            }).catch(e => {
              publishWorkflowMessage(2, generateErrorMessage(e.message, operateOn))
            }).then(() => {
              try {
                switch (operator) {
                  case 'resize':
                    const withoutConstraints = normalizedValues[2]
                    if (withoutConstraints) {
                      operateOn.resizeWithoutConstraints(normalizedValues[0], normalizedValues[1])
                    } else {
                      operateOn.resize(normalizedValues[0], normalizedValues[1])
                    }
                    break;
                  default:
                    operateOn[operator].apply(operateOn, normalizedValues)
                }
              } catch(e) {
                publishWorkflowMessage(2, generateErrorMessage(e.message, operateOn))
              }
            })
          }
        } else {
          try {
            for (const [i, value] of normalizedArgs.entries()) {
              parseExpression(operateOn, env, value).then(ret => {
                if (ret !== null) {
                  operator = argDefinitions[i]['operator']
                  operateOn[operator] = ret
                }
              }).catch(e => {
                publishWorkflowMessage(2, generateErrorMessage(e.message, operateOn))
              })
            }
          } catch(e) {
            publishWorkflowMessage(2, generateErrorMessage(e.message, operateOn))
          }
        }
      }
    }

    if ('outputs' in node) {
      outputObj.input.operateOn = operateOn
      outputs['output'] = outputObj
    }
  }
}

export default LayoutMixinComponent
