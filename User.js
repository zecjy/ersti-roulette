/**
 * Class representing an active User, always refers to an active socket
 */
class User {
  /**
   * creates new user with id and name
   * @param {string} id the socket id
   * @param {string} name the display name
   */
  constructor(id, name) {
    /**
     * id referring to an active socket
     * @type {string}
     */
    this.id = id;
    /**
     * display name, if not set its the same as the id
     */
    this.name = name;
    /**
     * if the user is ready to begin a new call
     * @type {boolean}
     */
    this.free = false;
    /**
     * x entries with ids that were last connected to prevent connection to the same user again
     * @type {string[]}
     */
    this.lastSeen = [];
    /**
     * counts how many connections to each other user this user had
     * @type {Object.<string, int>}
     */
    this.countPartners = {};
  }

  /**
   * updates the name of the user
   * @param {string} name displayname
   */
  setName(name) {
    this.name = name;
  }
}

module.exports = User;
