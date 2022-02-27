import axios from "axios";

const $ = (id) => document.getElementById(id);

axios.get('/api/list/1', {
  params:{
    _t: +new Date,
  }
}).then((res) => {
  const result = res.data;
  const $list = $('list');
  if(result.errno === 0){
    const { data } = result;
    console.log(data);
    const html = data.list.reduce((ret, item) => {
      ret += `<li><span class="col">${item.province}</span><span class="col">${item.city}</span><span class="col">${item.area}</span></li>`
      return ret;
    }, '');
    $list.innerHTML = '<ul>' + html + '</ul>'; 
  }else{
    $list.innerHTML = `<p>抱歉，接口请求错误！错误信息：${result.errmsg}</p>`
  }
});

$('btn').addEventListener('click', function(){
  axios.post('/list/1', {
  }).then((res) => {
    if(res.data && res.data.errno === 0){
      const { data } = res.data;
      alert(`新增id为${data.id}的项成功`);
    }else{
      alert('新增失败！');
    }
  });
}, false);