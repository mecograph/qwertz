import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './plugins.echarts';

createApp(App).use(createPinia()).mount('#app');
