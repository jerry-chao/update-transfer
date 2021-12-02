{% extends 'pageLayout/layout.vue'%}

<!-- vue template 代码块 -->
{% block vue_template %}
<layout app-title="<$ ctx.app.config.appTitle $>" app-directory-link="<$ ctx.app.config.appDirectoryLink $>"
        :menu-items="menuItems" :selected-item-wrapper="selectedItemWrapper" :user-info-wrapper="userInfoWrapper">

  <v-btn elevation="2" @click="insertItem">增加一条数据</v-btn>
  <v-btn @click="insertItem">删除一条数据</v-btn>
  <v-btn @click="insertItem">更新一条数据</v-btn>
  <v-card class="ma-5 mb-16">
    <v-list-item v-for="item of itemList" :key="item.id">
      <v-list-item-content>
        <v-list-item-title>id: {{ item.id }}</v-list-item-title>
        <v-list-item-subtitle>content: {{item.content}}</v-list-item-subtitle>
      </v-list-item-content>
    </v-list-item>
  </v-card>
</layout>
{% endblock %}

{% block vue_body %}

<script type="module">

// 引入 layout
import Layout from '/<$ ctx.app.config.appId $>/public/js/components/layout.js';

new Vue({
  el: '#app',
  template: '#app-template',
  vuetify: new Vuetify(),
  components: {
    "layout": Layout,
  },
  data: () => ({
    // 菜单配置
    menuItems: JSON.parse('<$ ctx.app.config.menuList | dump | safe $>'),
    userInfoWrapper: {
      userInfo: {
      },
    },
    selectedItemWrapper: {
      selectedItem: 0
    },

    // form & delete
    requireRules: [
      v => !!v || 'This is required',
    ],

    // table
    loading: true,
    itemList: [],
    pullDownList: {}
  }),
  computed: {

  },
  watch: {

  },
  async created() {
    this.getItemList();
  },

  methods: {
    async getItemList() {
      this.loading = true;
      const selectResult = await protocol.test_selectItemList({}, `.orderBy(\'id\', \'desc\')`);
      this.itemList = selectResult.rows;
      this.loading = false;
    },
    async insertItem() {
      await protocol.test_insertItem({content: '测试内容'});
      await this.getItemList();
    },
    async deleteItem() {
      await protocol.test_deleteItem({}, `.where(function() {this.where({ id: 1 })})`);
      await this.getItemList();
    },
    async updateItem() {
      await protocol.test_updateItem({context: '更新测试'}, `.where(function() {this.where({ id: 1 })})`);
      await this.getItemList();
    },
    // 下来菜单通过数据库的简单使用
    async getAndFillPullDownItemByFields() {
      const pullDownListResult = await protocol.pullDownList_selectPullDownList({}, '');
      if (pullDownListResult.rows && pullDownListResult.rows.length) {
        pullDownListResult.rows.forEach((pullDown) => {
          this.pullDownList[pullDown.pullDownName] = JSON.parse(pullDown.pullDownValue);
        })
      }
    },

    // js 原生方法代理到 vue 中
    dayjs: dayjs,
  }
})
</script>

{% endblock %}
