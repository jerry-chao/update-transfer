export default {
  name: 'vtoast',

  data() {
    return{
      showSnackbar: false,
      message: '',
      color: 'success',
      icon: 'mdi-check',
      timer: 3000
    }
  },
  methods:{
    show(data) {
      this.message = data.message || 'missing "message".'
      this.color = data.color || 'success'
      this.timer = data.timer || 3000
      this.icon = data.icon || 'mdi-check'
      this.showSnackbar = true
    },
    success(msg) {
      this.message = msg
      this.color = 'primary'
      this.timer =  3000
      this.icon = 'mdi-check'
      this.showSnackbar = true
    },
    fail(msg) {
      this.message = msg
      this.color = 'warning'
      this.timer = 3000
      this.icon = 'mdi-cancel'
      this.showSnackbar = true
    },
  },

  template: `
  <v-snackbar
      :color="color"
      :timeout="timer"
      v-model="showSnackbar"
      top
  >
    <v-icon left>{{icon}}</v-icon>{{message}}
  </v-snackbar>
`
}
