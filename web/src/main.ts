import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import './styles.css';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
import './plugins.echarts';
import { runRuntimeSetupChecks } from './services/runtimeSetup';
import { useAuthStore } from './stores/useAuthStore';

runRuntimeSetupChecks();

const pinia = createPinia();
const app = createApp(App);
app.use(pinia);
app.mount('#app');

const authStore = useAuthStore();
authStore.initAuthListener();
