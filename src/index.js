import Swagger from 'swagger-client';

export default (opts) => () => next => action => {
  const { swagger, types, ...rest } = action; // eslint-disable-line no-redeclare
  const [REQUEST, SUCCESS, FAILURE] = types;
  const waitQueue = [];
  let ready = false;
  const callApi = client => sw => {
    if (typeof swagger === 'function') {
      sw(client)
        .then(
          (result) => next({ ...rest, result, type: SUCCESS }),
          (error) => next({ ...rest, error, type: FAILURE })
        ).catch(error => {
          console && console.error && console.error('MIDDLEWARE ERROR:', error);
          next({ ...rest, error, type: FAILURE });
        });
    } else {
      console.error('Swagger api call is not a function');
    }
  };
  const client = new Swagger({
    ...opts,
    success: () => {
      ready = true
      while (waitQueue.length) {
        const a = waitQueue.shift();
        callApi(client)(a.swagger);
        next({ ...rest, type: REQUEST });
      }
    }
  });

  if (action.swagger) {
    // Add async api calls to queue if not ready
    if (!ready) {
      waitQueue.push(action);
    } else {
      // Call payload and pass the swagger client
      callApi(client)(action.swagger);
      return next(action);
    }
  } else {
    return next(action);
  }
  return false;
}
