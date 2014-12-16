  /**
   * The events that are emitted by the SwaggerServer object.
   */
  this.events = {
    /**
     * Fires when the Swagger file changes, indicating that it will be reloaded.
     * When the new file is done loading, the `specLoaded` event is fired.
     */
    specChange: 'specChange',

    /**
     * Fires when the Swagger file is first loaded, and again each time the file is reloaded.
     * Until this event is fired, it is not safe to access the {@link SwaggerServer#swaggerObject} property.
     */
    specLoaded: 'specLoaded',

    /**
     * Fires when the Swagger server is first started.
     * This event is only fired once.
     */
    start: 'start'
  };
