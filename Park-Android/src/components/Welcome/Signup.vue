<template>
 <div>
    <div style="text-align: center;margin-top: 95px;font-size: 25px;color: #13227a;"><h1>Sign Up</h1></div>
    <div style="text-align: center;"><img class="image" src="../../assets/icon/signup.png"></div>
    <div class="mycontainer">
        <group>
           <x-input title="Username" name="mobile" placeholder="Phone number " keyboard="number"
           mask="999 9999 9999" v-model="username" :max="13" is-type="china-mobile"></x-input>
           <x-input title="Password" type="password" placeholder="Password" v-model="password" :min="6" :max="18" @on-change="change"></x-input>
           <x-input title="Confirm" v-model="password2" type="password" placeholder="Password" :equal-with="password"></x-input>
        </group>
    </div>
    <div>
      <x-button plain @click.native="signa" style="border-radius:5px; width: 85%;margin-top: 50px;">Sign Up</x-button>
    </div>
 </div>
</template>
<script>
import { XInput,Group,XButton } from 'vux'
export default {
  data() {
      return {
        password: '',
        password2: '',
        username: '',
        apiUrl: 'http://localhost:8083/parkingApp/rest/hello/signup',
        payload: {'username':'', 'password':''}
      }
  },
  components: {
     Group,
     XButton,
     XInput
  },
  methods: {
    signa() {
      console.log(this.username + this.password)
      this.payload.username = this.username.replace(/\s+/g,"");
      this.payload.password = this.password
      var payloadStr = JSON.stringify(this.payload)
      console.log(this.apiUrl + payloadStr)
      this.axios.post(this.apiUrl, payloadStr,{headers: {'Content-Type': 'application/json;charset=UTF-8'}})
                .then(res=>{
                    console.log(res)
                    var resDate = res.data
                    console.log(resDate)
                    if (resDate=='Sign Up Successfully'){
                        this.$router.push({path: '/Signin'})
                    }
                    else{
                        alert('Signup Failed')
                    }
                })
                .catch(function (error) {
                    console.log(error)
                })
    },
    change (val) {
      console.log('on change', val)
    }
  }
}
</script>

<style scoped>
body,p,ul,li{
    margin: 0px;
    padding:0px;
}

*{
  text-decoration: none;
  list-style: none;
}
.image {
  margin-top:30px;
  height: 80px;
  width: 80px;
}
.mycontainer {
  margin-top: 10px;
}
</style>
