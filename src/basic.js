

export class BasicThrottle {
  constructor(options = {}) {
    this.keyGenerator = options.keyGenerator;
    this.options = Object.assign({}, options);
    delete this.options.store;
    delete this.options.keyGenerator;
  }

  backoff(state) {
    if ()
  }

}
