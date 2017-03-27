import Swagger from 'swagger-client';

export default function swaggerMiddleware(opts) {
  return ({ dispatch, getState }) => next => action => {
    if (typeof action === 'function') {
      return action(dispatch, getState);
    }

    if (!action.swagger) {
      return next(action);
    }
    const { swagger, types, ...rest } = action;
    const [REQUEST, SUCCESS, FAILURE] = types;
    const waitQueue = [];
    let ready = false;
    const callApi = client => sw => (
      typeof swagger === 'function'
        ? sw(client)
          .then(
            (result) => next({ ...rest, result, type: SUCCESS }),
            (error) => next({ ...rest, error, type: FAILURE })
          ).catch(error => {
            console && console.error && console.error('MIDDLEWARE ERROR:', error);
            next({ ...rest, error, type: FAILURE });
          })
        : console.error('Swagger api call is not a function')
      );

    const client = new Swagger({
      ...opts,
      success: () => {
        ready = true
        while (waitQueue.length) {
          const a = waitQueue.shift();
          next({ ...rest, type: REQUEST });
          callApi(client)(a.swagger);
        }
      }
    });

    // Add async api calls to queue if not ready
    if (!ready) {
      waitQueue.push(action);
    } else {
      // Call payload and pass the swagger client
      next({ ...rest, type: REQUEST });
      return callApi(client)(action.swagger);
    }

    return undefined;
  }
}
