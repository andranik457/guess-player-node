
const variables = {};

module.exports = {
  /**
   * @param {string} key - Global variable key
   * @param {string} value  - Global variable key
   */
    $set (key, value) {
        variables[key] = value;
    },

  /**
   * @param {string} key - Global variable key
   * @return {string} Global variable value
   */
    $get (key) {
        return variables[key];
    }
};
